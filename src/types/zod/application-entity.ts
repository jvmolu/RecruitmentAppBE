import Status  from "../enums/status";
import ApplicationStages from "../enums/application-stages";
import BaseSchema, { BaseSearchParams } from "./base-entity";
import { z } from "zod";
import Currency from "../enums/currency";
import PaymentPer from "../enums/payment-per";
import { JobWithCompanyData } from "./job-entity";
import { UserWithProfileData } from "./user-entity";
import { ApplicationLifecycleType } from "./application-lifecycle-entity";
import { DateRange } from "./range-entities";
import WorkModel from "../enums/work-model";
import JobsType from "../enums/job-type";
import { MatchReportType } from "./match-report-entity";
import { InterviewWithRelatedData } from "./interview-entity";

const ApplicationSchema = BaseSchema.merge(
    z.object({
      candidateId: z.string().uuid(),
      jobId: z.string().uuid(),
      skillDescriptionMap: z.record(z.string(), z.string()),
      generalWorkExp: z.string(),
      currentAddress: z.string(),
      expectedBudgetAmount: z.number().int().optional(),
      expectedBudgetCurrency: z.nativeEnum(Currency).optional(),
      matchReportId: z.string().uuid().optional(),
      expectedBudgetPer: z.nativeEnum(PaymentPer).optional(),
      noticePeriod: z.number().int(),
      resumeLink: z.string(),
      coverLetter: z.string(),
      status: z.nativeEnum(Status).default(Status.ACTIVE),
      stage: z.nativeEnum(ApplicationStages).default(ApplicationStages.APPLIED),
      inviteId: z.string().uuid().optional(),
      reference1: z.string().optional(),
      reference2: z.string().optional(),
      reference3: z.string().optional()
    })
);

const ApplicationSearchSchema = BaseSchema.merge(
    z.object({
      candidateId: z.string().uuid().nullable(),
      jobId: z.string().uuid().nullable(),
      generalWorkExp: z.string().nullable(),
      currentAddress: z.string().nullable(),
      expectedBudgetAmount: z.number().int().nullable(),
      expectedBudgetCurrency: z.nativeEnum(Currency).nullable(),
      expectedBudgetPer: z.nativeEnum(PaymentPer).nullable(),
      noticePeriod: z.number().int().nullable(),
      status: z.nativeEnum(Status).nullable(),
      stage: z.nativeEnum(ApplicationStages).nullable(),
      inviteId: z.string().uuid().nullable(),
      matchReportId: z.string().uuid().nullable(),

      // Job Table related fields
      workModel: z.nativeEnum(WorkModel).nullable(),
      jobType: z.nativeEnum(JobsType).nullable(),
      location: z.string().nullable(),
      title: z.string().nullable(),

      // Min-Max Options - Handled in repository
      // Range will be like: {min: 0, max: 10}
      createdAtRange: DateRange.optional(),
      updatedAtRange: DateRange.optional()

    })
);

const ApplicationSearchParamsSchema = BaseSearchParams.merge(
  z.object({

      // I will recieve strings and hence I need transformations which will convert the string to boolean
      isShowJobData: z
        .union([z.boolean(), z.string()])
        .default(true)
        .transform((val) => (typeof val === "string" ? val === "true" : val)),

      isShowCandidateData: z
        .union([z.boolean(), z.string()])
        .default(true)
        .transform((val) => (typeof val === "string" ? val === "true" : val)),

      isShowLifeCycleData: z
        .union([z.boolean(), z.string()])
        .default(true)
        .transform((val) => (typeof val === "string" ? val === "true" : val)),

      isShowPendingInvites: z
        .union([z.boolean(), z.string()])
        .default(false)
        .transform((val) => (typeof val === "string" ? val === "true" : val)),
      
      isShowMatchReport: z
        .union([z.boolean(), z.string()])
        .default(false)
        .transform((val) => (typeof val === "string" ? val === "true" : val)),
      
      isShowInterviewData: z
        .union([z.boolean(), z.string()])
        .default(false)
        .transform((val) => (typeof val === "string" ? val === "true" : val)),
  })
);

type ApplicationType = z.infer<typeof ApplicationSchema>
type ApplicationSearchOptions = z.infer<typeof ApplicationSearchSchema>
type ApplicationSearchParams = z.infer<typeof ApplicationSearchParamsSchema>
type ApplicationWithRelatedData = ApplicationType & {
  job : Partial<JobWithCompanyData> | undefined,
  candidate: Partial<UserWithProfileData> | undefined,
  lifecycle: ApplicationLifecycleType[] | undefined,
  matchReport: MatchReportType | undefined,
  interviews: Partial<InterviewWithRelatedData>[] | undefined
}

class Application implements ApplicationType {
  id: string;
  candidateId: string;
  jobId: string;
  skillDescriptionMap: { [key: string]: string };
  generalWorkExp: string;
  currentAddress: string;
  expectedBudgetAmount?: number;
  expectedBudgetCurrency?: Currency;
  expectedBudgetPer?: PaymentPer;
  noticePeriod: number;
  resumeLink: string;
  coverLetter: string;
  status: Status;
  stage: ApplicationStages;
  inviteId?: string;
  reference1?: string;
  reference2?: string;
  reference3?: string;
  createdAt: string;
  updatedAt: string;

  constructor(applicationData: ApplicationType) {
    const validatedData = ApplicationSchema.parse(applicationData);
    this.id = validatedData.id;
    this.candidateId = validatedData.candidateId;
    this.jobId = validatedData.jobId;
    this.skillDescriptionMap = validatedData.skillDescriptionMap;
    this.generalWorkExp = validatedData.generalWorkExp;
    this.currentAddress = validatedData.currentAddress;
    this.expectedBudgetAmount = validatedData.expectedBudgetAmount;
    this.expectedBudgetCurrency = validatedData.expectedBudgetCurrency;
    this.expectedBudgetPer = validatedData.expectedBudgetPer;
    this.noticePeriod = validatedData.noticePeriod;
    this.resumeLink = validatedData.resumeLink;
    this.coverLetter = validatedData.coverLetter;
    this.status = validatedData.status;
    this.stage = validatedData.stage;
    this.inviteId = validatedData.inviteId;
    this.reference1 = validatedData.reference1;
    this.reference2 = validatedData.reference2;
    this.reference3 = validatedData.reference3;
    this.createdAt = validatedData.createdAt;
    this.updatedAt = validatedData.updatedAt;
  }
}

export {
  ApplicationSchema,
  ApplicationType,
  Application,
  ApplicationSearchSchema,
  ApplicationSearchOptions,
  ApplicationSearchParamsSchema,
  ApplicationSearchParams,
  ApplicationWithRelatedData
};
