// In this cron, pick some jobs in db and get the matches for them. First delete all matches and then insert new matches.

import { JobService } from "../services/job-service";
import { GeneralAppResponse, isGeneralAppFailureResponse } from "../types/response/general-app-response";
import { JobWithCompanyData } from "../types/zod/job-entity";
import { PoolClient } from "pg";
import dotenv from 'dotenv';
import { Transactional } from "../decorators/transactional";
import { MatchType } from "../types/zod/match-entity";
import { InterviewRepository } from "../repositories/interview-repository";
import { InterviewType } from "../types/zod/interview-entity";
import HttpStatusCode from "../types/enums/http-status-codes";
import { CronJob } from 'cron';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

dotenv.config({ path: __dirname + "/./../../.env" });

const MATCH_UPDATE_INTERVAL = parseInt(process.env.MATCH_UPDATE_INTERVAL || "3600000"); // milliseconds
const INTERVIEW_UPDATE_INTERVAL = 3600000; // 1 hour in milliseconds

// Configure winston loggers with daily rotation
const matchUpdateLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new DailyRotateFile({
            filename: 'logs/match-update-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d' // Keep logs for the last 14 days
        })
    ]
});

const interviewStatusUpdateLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new DailyRotateFile({
            filename: 'logs/interview-status-update-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d' // Keep logs for the last 14 days
        })
    ]
});

class CronService {

    private static interviewRepository: InterviewRepository = new InterviewRepository();
    private static matchUpdateJob: CronJob;
    private static interviewStatusUpdateJob: CronJob;
    
    @Transactional()
    private static async updateMatchesForAllJobs(client?: PoolClient): Promise<GeneralAppResponse<void>> {
        // Get all jobs
        const jobsResponse = await JobService.findByParams({}, {});
        if(isGeneralAppFailureResponse(jobsResponse)) {
            return jobsResponse;
        }

        const jobs: JobWithCompanyData[] = jobsResponse.data;
        const matchUpdatePromises: Promise<GeneralAppResponse<MatchType[]>>[] = [];

        for(let job of jobs) {
            if(job.id) {
                const matchesResponsePromise = JobService.getMatchesForJob(job.id, parseFloat(process.env.DEFAULT_MATCH_THRESHOLD || "0"), client);
                matchUpdatePromises.push(matchesResponsePromise);
            }
        }

        await Promise.all(matchUpdatePromises);
        return { success: true, data: undefined };
    }

    @Transactional()
    private static async updateInterviewStatuses(client?: PoolClient): Promise<GeneralAppResponse<void>> {
        try {
            const interviewRepositoryResponse: GeneralAppResponse<InterviewType[]> = await CronService.interviewRepository.dropExpiredInterviews(client);
            if(isGeneralAppFailureResponse(interviewRepositoryResponse)) {
                interviewStatusUpdateLogger.error("Error during interview status update cron job execution:", { error: interviewRepositoryResponse.error });
                return interviewRepositoryResponse;
            }
            interviewStatusUpdateLogger.info('Expired interviews dropped:', { count: interviewRepositoryResponse.data.length });
            return { success: true, data: undefined };
        } catch (error: any) {
            interviewStatusUpdateLogger.error("Error during interview status update cron job execution:", { error });
            return {
                error,
                businessMessage: 'Internal server error',
                statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
                success: false
            };
        }
    }

    private static scheduleJobs() {
        
        const matchUpdateCronExpression = `*/${MATCH_UPDATE_INTERVAL / 60000} * * * *`;
        const interviewUpdateCronExpression = `*/${INTERVIEW_UPDATE_INTERVAL / 60000} * * * *`;

        CronService.matchUpdateJob = new CronJob(matchUpdateCronExpression, async () => {
            matchUpdateLogger.info('Running Match Update Cron Job...');
            try {
                await CronService.updateMatchesForAllJobs();
                matchUpdateLogger.info('Match Update Cron Job Done.');
            } catch (err) {
                matchUpdateLogger.error("Error during match update cron job execution:", { error: err });
            }
        });

        CronService.interviewStatusUpdateJob = new CronJob(interviewUpdateCronExpression, async () => {
            interviewStatusUpdateLogger.info('Running Interview Status Update Cron Job...');
            try {
                await CronService.updateInterviewStatuses();
                interviewStatusUpdateLogger.info('Interview Status Update Cron Job Done.');
            } catch (err) {
                interviewStatusUpdateLogger.error("Error during interview status update cron job execution:", { error: err });
            }
        });

        CronService.matchUpdateJob.start();
        CronService.interviewStatusUpdateJob.start();
    }

    public static async runCronJob() {
        CronService.scheduleJobs();
    }

    public static async stopCronJob() {
        CronService.matchUpdateJob.stop();
        CronService.interviewStatusUpdateJob.stop();
    }
}

async function main() {
    process.on('SIGTERM', CronService.stopCronJob);
    process.on('SIGINT', CronService.stopCronJob);
    await CronService.runCronJob();
}

main().catch((err) => {
    console.error("Error during cron job execution:", err.message);
});