import { createApp } from './app'
import { env } from './env'
import { logger } from './logger'

const app = createApp()

app.listen(env.BACKEND_PORT, () => {
  logger.info({ port: env.BACKEND_PORT }, 'backend listening')
})
