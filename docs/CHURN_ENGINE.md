# Churn engine

Tiering is deterministic: recency 20%, frequency 20%, monetary 20%, lifetime value 18%, product diversity 12%, relationship duration 10%. Default tiers are Strategic 78+, Core 58-77, Growth 38-57 and Standard below 38.

Churn weights cover recency deterioration 13%, frequency 16%, monetary 12%, engagement 8%, unresolved complaints 16%, negative sentiment 10%, competitor mentions 7%, cancellation language 10% and missed commitments 8%. The production schema supports additional required components. Default risk boundaries: Low 0-29, Medium 30-59, High 60-79, Critical 80-100. Settings make them configurable. Results store components, factors, evidence, confidence, revenue-at-risk, response deadline, version and timestamp.
