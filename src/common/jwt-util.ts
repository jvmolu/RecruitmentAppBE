import jwt, { JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { AuthError } from '../types/error/auth-error';
import { GeneralAppResponse, isGeneralAppFailureResponse } from '../types/response/general-app-response';
import HttpStatusCode from '../types/enums/http-status-codes';
import { v4 } from 'uuid';
import RedisService from '../services/redis-service';
import { Constants } from './constants';

dotenv.config({ path: __dirname + "/./../../.env" });

const JWT_SECRET: string | undefined = process.env.JWT_SECRET;
const JWT_EXPIRY: string | undefined = process.env.JWT_EXPIRY;

export async function generateJWTToken(userId: String) : Promise<GeneralAppResponse<string>> {
    if(!JWT_SECRET || !JWT_EXPIRY) {
        console.error('JWT_SECRET or JWT_EXPIRY is not defined');
        return {
            error: new Error('JWT_SECRET or JWT_EXPIRY is not defined') as AuthError,
            statusCode: 500,
            businessMessage: 'Internal server error',
            success: false
        }
    }
    
    // Store session in Redis
    let sessionId: string = v4();
    let expiresInMillis: number = 24 * 60 * 60 * 1000; // 24 hours
    let redisSetResponse: GeneralAppResponse<undefined> = await RedisService.set(userId + "-" + Constants.SESSION_ID, sessionId, {expiresInMillis: expiresInMillis});
    if(isGeneralAppFailureResponse(redisSetResponse)) {
        return redisSetResponse;
    }

    return {
        data: jwt.sign({userId: userId, sessionId: sessionId}, JWT_SECRET, { expiresIn: JWT_EXPIRY, algorithm: 'HS256' }),
        success: true
    };
}

export function verifyJWTToken(token: string) : GeneralAppResponse<JwtPayload> {
    if(!JWT_SECRET) {
        console.error('JWT_SECRET is not defined');
        return {
            error: new Error('JWT_SECRET is not defined') as AuthError,
            statusCode: 500,
            businessMessage: 'Internal server error',
            success: false
        }
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        let data: JwtPayload = decoded as JwtPayload;
        if(!data.userId || !data.sessionId) {
            return {
                error: new Error('Invalid token - missing userId / sessionId') as AuthError,
                statusCode: HttpStatusCode.BAD_REQUEST,
                businessMessage: 'Invalid token',
                success: false
            }
        }
        return {
            data: data,
            success: true
        };
    }
    catch(err: any) {
        let error: AuthError = new Error('Error while verifying token') as AuthError;
        error.errorType = 'AuthError';
        switch(err.name) {
            case 'TokenExpiredError':
                error.message = 'Token expired';
                break;
            case 'JsonWebTokenError':
                error.message = 'Invalid token';
                break;
        }
        return {
            error: error,
            statusCode: HttpStatusCode.UNAUTHORIZED,
            businessMessage: error.message,
            success: false
        }
    }
}

export function getUserIdFromToken(token: string) : GeneralAppResponse<string> {
    const response: GeneralAppResponse<JwtPayload> = verifyJWTToken(token);
    if(response.success) {
        return {
            data: response.data.userId,
            success: true
        };
    }
    return {
        error: response.error,
        statusCode: response.statusCode,
        businessMessage: response.businessMessage,
        success: false
    };
}

export function getSessionIdFromToken(token: string) : GeneralAppResponse<string> {
    const response: GeneralAppResponse<JwtPayload> = verifyJWTToken(token);
    if(response.success) {
        return {
            data: response.data.sessionId,
            success: true
        };
    }
    return {
        error: response.error,
        statusCode: response.statusCode,
        businessMessage: response.businessMessage,
        success: false
    };
}
