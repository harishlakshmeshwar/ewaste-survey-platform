import { createApp } from './app'
import { validateEnv } from './config'

const { app, issues, warnings } = createApp()

const validation = validateEnv()
const port = validation.env?.PORT ?? 3001

app.listen(port, () => {
  console.log(`[ewaste] API server listening on http://localhost:${port}`)
  for (const warning of warnings) console.warn(`[ewaste] warning: ${warning}`)
  for (const issue of issues) console.error(`[ewaste] env error — ${issue.path}: ${issue.message}`)
})
