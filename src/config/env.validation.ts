import Joi from 'joi'

type Environment = {
  ADMIN_DISPLAY_NAME: string
  ADMIN_EMAIL: string
  ADMIN_PASSWORD: string
  DATABASE_SSL: boolean
  DATABASE_URL: string
  FRONTEND_URL: string
  NODE_ENV: 'development' | 'production' | 'test'
  PORT: number
  SUPABASE_PUBLISHABLE_KEY: string
  SUPABASE_PRODUCT_IMAGES_BUCKET: string
  SUPABASE_SECRET_KEY: string
  SUPABASE_URL: string
}

const environmentSchema = Joi.object<Environment>({
  ADMIN_DISPLAY_NAME: Joi.string().min(2).default('Administrador Auralith'),
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.string().min(12).required(),
  DATABASE_SSL: Joi.boolean().truthy('true').falsy('false').default(true),
  DATABASE_URL: Joi.string()
    .pattern(/^postgres(?:ql)?:\/\/.+/i)
    .required(),
  FRONTEND_URL: Joi.string().required(),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  SUPABASE_PUBLISHABLE_KEY: Joi.string().min(20).required(),
  SUPABASE_PRODUCT_IMAGES_BUCKET: Joi.string().default('product-images'),
  SUPABASE_SECRET_KEY: Joi.string().min(20).required(),
  SUPABASE_URL: Joi.string().uri().required(),
}).unknown(true)

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const { error, value } = environmentSchema.validate(config, {
    abortEarly: false,
    convert: true,
  })

  if (error) {
    throw new Error(`Configuracion de entorno invalida: ${error.message}`)
  }

  return value
}
