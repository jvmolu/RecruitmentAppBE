// In this cron, pick some jobs in db and get the matches for them. First delete all matches and then insert new matches.

import { JobService } from "../services/job-service";
import { MatchService } from "../services/match-service";
import { JobRepository } from "../repositories/job-repository";
import { GeneralAppResponse, isGeneralAppFailureResponse } from "../types/response/general-app-response";
import { JobType, JobWithCompanyData } from "../types/zod/job-entity";
import { PoolClient } from "pg";
import dotenv from 'dotenv';
import { Transactional } from "../decorators/transactional";
import { MatchType } from "../types/zod/match-entity";

dotenv.config({ path: __dirname + "/./../../.env" });

const INTERVAL = parseInt(process.env.MATCH_UPDATE_INTERVAL || "60000"); // milliseconds

class CronService {
    
    @Transactional()
    private static async updateMatchesForAllJobs(client?: PoolClient) {

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
    }

    public static async runCronJob() {
        // run the above method every minute
        console.log('Running Match Update Cron Job...');
        try {
            await CronService.updateMatchesForAllJobs();
            console.log('Match Update Cron Job Done.');
            setTimeout(CronService.runCronJob, INTERVAL);
        } catch (err) {
            console.error("Error during match update cron job execution:", err);
        }
    }
}

async function main() {
    await CronService.runCronJob();
}

main().catch((err) => {
    console.error("Error during cron job execution:", err.message);
});