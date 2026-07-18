# Mock data

All records are synthetic. The 30 customers cover Strategic, Core, Growth and Standard tiers; multi-category transactions span twelve calendar months; conversations cover WhatsApp, email and support chat. Scenarios A-D are described in the root README. The four PDFs are approved grounding documents and the PNG is a campaign visual.

Generate the binary artefacts with `node scripts/generate-mock-assets.mjs`. Reset configured Supabase with `supabase db reset`, then `node scripts/reset-demo.mjs`. Neither command deletes `/mock-data`.
