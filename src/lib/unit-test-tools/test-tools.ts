import { anyString, anything, instance, mock, when } from "ts-mockito"
import { Logger } from "../logging/Logger"
import { LoggerFactory } from "../logging/LoggerFactory"

export function mockLoggerFactory(): LoggerFactory {
  const factory = mock(LoggerFactory)
  const logger = mock<Logger>()

  when(factory.createLogger(anyString())).thenReturn(instance(logger))
  when(factory.createForClass(anything())).thenReturn(instance(logger))

  return instance(factory)
}
