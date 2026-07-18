# AVO

AVO is an assistant and recommendation engine, never an autonomous decision-maker. It analyses authorised conversations, explains risk, answers scoped questions and creates editable drafts. `OpenAIProvider` uses the Responses API and configured GPT-5.6 model; `DemoAVOProvider` makes the application fully demonstrable without a key and always labels output **AVO Demo Analysis**.

Conversation output is Zod-validated. Every evidence citation must match an supplied message ID. Customer messages are untrusted and instruction-like content is removed before model submission. AVO abstains with “Insufficient evidence - staff review required.” It cannot change tiers/scores, approve itself, send private messages, publish, or invent commercial facts. Demo fallback was exercised end to end. Live-mode request construction, strict JSON schema, Zod validation and evidence checks were exercised with an injected transport; no external OpenAI request was made because no key was supplied.
