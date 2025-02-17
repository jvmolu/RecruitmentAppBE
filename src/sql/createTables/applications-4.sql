-- ALTER TABLE applications
--     ADD COLUMN reference1 TEXT,
--     ADD COLUMN reference2 TEXT,
--     ADD COLUMN reference3 TEXT;

INSERT INTO applications (
    id,
    created_at,
    updated_at,
    candidate_id,
    job_id,
    skill_description_map,
    general_work_exp,
    current_address,
    expected_budget_amount,
    notice_period,
    resume_link,
    cover_letter,
    status,
    stage,
    match_report_id
) VALUES (
    'aa6c5046-0f87-4518-a515-d2eb8d610d6d',
    '2025-02-07 15:42:50.145Z',
    '2025-02-07 15:42:50.145Z',
    '440a303e-83f9-4877-aaaa-205663e1ed8d',
    '1a577c34-6013-474e-89d6-f255bcbf1b57',
    '{"CEOs": "TEST", "HRMP": "TEST"}',
    'TEST',
    'ABCD',
    123123123123,
    30,
    '/cand/applications/aa6c5046-0f87-4518-a515-d2eb8d610d6d/resume.pdf',
    'HEU',
    'ACTIVE',
    'APPLIED',
    '759323f6-2a0e-434f-a6ef-4db507063e82'
) RETURNING *;