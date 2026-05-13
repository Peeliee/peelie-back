import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { ApiSuccessResponseDto } from '../dto/api-response.dto';

interface WrappedOptions {
  isArray?: boolean;
  description?: string;
  status?: 200 | 201;
}

/**
 * { status, success, message, data: T } 형태의 응답을 Swagger schema 로 표현.
 * data 부분이 dataType (또는 dataType[]) 이 되도록 allOf + ref 조합.
 */
export const ApiOkResponseWrapped = <T extends Type<unknown>>(
  dataType: T,
  options: WrappedOptions = {},
) => {
  const { isArray = false, description, status = 200 } = options;
  const responseDecorator = status === 201 ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, dataType),
    responseDecorator({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiSuccessResponseDto) },
          {
            properties: {
              data: isArray
                ? { type: 'array', items: { $ref: getSchemaPath(dataType) } }
                : { $ref: getSchemaPath(dataType) },
            },
          },
        ],
      },
    }),
  );
};

/**
 * union response (oneOf). 응답이 type 으로 분기되는 endpoint 용.
 */
export const ApiOkResponseWrappedOneOf = (
  dataTypes: Type<unknown>[],
  options: WrappedOptions = {},
) => {
  const { description, status = 200 } = options;
  const responseDecorator = status === 201 ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, ...dataTypes),
    responseDecorator({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiSuccessResponseDto) },
          {
            properties: {
              data: {
                oneOf: dataTypes.map((t) => ({ $ref: getSchemaPath(t) })),
              },
            },
          },
        ],
      },
    }),
  );
};
