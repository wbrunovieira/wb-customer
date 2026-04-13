import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is up', schema: { example: { status: 'ok', timestamp: '2024-01-01T00:00:00.000Z' } } })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}
