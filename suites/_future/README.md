<!-- Author: Anil Kalisetti -->
# Future work (placeholders)

Files in this folder are **templates, not tests**. They are not registered in
`config/suites.js`, so no profile and no CI job runs them. Each file explains,
in its header comment, what it is for and the steps to turn it into a real suite.

| File | Idea |
| --- | --- |
| `simulated-user.example.yaml` | An LLM plays the customer for realistic multi-turn tests |
| `http-target.example.yaml` | Evaluate an existing chatbot / RAG service over HTTP |
| `workflow-provider.example.js` | Run a whole multi-step workflow as one atomic test |
| `moderation-and-guardrails.example.yaml` | `moderation` and `guardrails` assertions |

Red-team generation (`promptfoo redteam`) is deliberately **out of scope**: this
framework is for evaluations only, and red-team generation can send data to a
hosted service when no API key is set.
