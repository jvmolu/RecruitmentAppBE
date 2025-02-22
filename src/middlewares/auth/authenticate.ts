import {Request, Response, NextFunction} from 'express';
import { UserService } from '../../services/user-service';
import { GeneralAppResponse, isGeneralAppFailureResponse } from '../../types/response/general-app-response';
import { UserAuthData } from '../../types/user-auth-data';
import HttpStatusCode from '../../types/enums/http-status-codes';
import { getSessionIdFromToken } from '../../common/jwt-util';
import RedisService from '../../services/redis-service';
import { Constants } from '../../common/constants';

const Authenticate = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try {
        
        const token: string | undefined = req.headers.authorization;
        const authResponse: GeneralAppResponse<Omit<UserAuthData, "password">> = await UserService.findUserByToken(token);
        if(isGeneralAppFailureResponse(authResponse)) {
            res.status(authResponse.statusCode).json({
                success: false,
                message: authResponse.businessMessage,
                error: authResponse.error
            });
            return;
        }

        // Add user to the request
        req.body.user = authResponse.data;
        
        // Get SessionId from the token
        const sessionIdResponse: GeneralAppResponse<string> = getSessionIdFromToken(token as string);
        if(isGeneralAppFailureResponse(sessionIdResponse)) {
            res.status(HttpStatusCode.UNAUTHORIZED).json({
                success: false,
                message: sessionIdResponse.businessMessage,
                error: sessionIdResponse.error
            });
            return;
        }

        // Validate sessionId in Redis
        const redisSessionIdResponse: GeneralAppResponse<string | null> = await RedisService.get(req.body.user.id + "-" + Constants.SESSION_ID);
        if(isGeneralAppFailureResponse(redisSessionIdResponse)) {
            res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: redisSessionIdResponse.businessMessage,
                error: redisSessionIdResponse.error
            });
            return;
        }

        const sessionId: string = sessionIdResponse.data;
        const redisSessionId: string | null = redisSessionIdResponse.data;

        if(redisSessionId !== sessionId) {
            res.status(HttpStatusCode.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid session id - seems like you logged in from another device',
            });
            return;
        }
        
        next();
    }
    catch (error) {
        console.log(error);
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

export default Authenticate;
