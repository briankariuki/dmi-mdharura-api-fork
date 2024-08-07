import { Joi } from 'celebrate';

export const joi = Joi.defaults((schema) => {
  switch (schema.type) {
    case 'string':
      return schema.allow('', null);
    default:
      return schema;
  }
});

export const fileJoi = Joi.object({
  ext: Joi.string(),
  mime: Joi.string(),
  type: Joi.string().allow('image', 'video'),
  thumbnail: Joi.string(),
  filename: Joi.string(),
  size: Joi.number(),
  dimensions: Joi.object({
    height: Joi.number(),
    width: Joi.number(),
    orientation: Joi.number(),
  }),
});

export const monetizationJoi = Joi.object({
  description: Joi.string(),
  price: Joi.number(),
  status: Joi.string().allow('on', 'off'),
});
