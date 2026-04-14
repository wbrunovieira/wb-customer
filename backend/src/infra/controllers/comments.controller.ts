import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards, NotFoundException, HttpCode } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CurrentUser } from '@/infra/auth/decorators/current-user.decorator'
import { AddCommentUseCase } from '@/domain/tasks/application/use-cases/add-comment.use-case'
import { ListCommentsUseCase } from '@/domain/tasks/application/use-cases/list-comments.use-case'
import { ResolveCommentUseCase } from '@/domain/tasks/application/use-cases/resolve-comment.use-case'
import { ReactToCommentUseCase } from '@/domain/tasks/application/use-cases/react-to-comment.use-case'
import { DeleteCommentUseCase } from '@/domain/tasks/application/use-cases/delete-comment.use-case'
import { TaskComment } from '@/domain/tasks/enterprise/entities/task-comment'

class AddCommentDto {
  @ApiPropertyOptional() body?: string
  @ApiPropertyOptional() audioUrl?: string
  @ApiPropertyOptional() parentId?: string
}

class ReactDto {
  @ApiProperty() emoji!: string
  @ApiProperty() toggle!: boolean
}

function toHttp(c: TaskComment): object {
  return {
    id: c.id.value,
    taskId: c.taskId,
    parentId: c.parentId,
    authorUserId: c.authorUserId,
    body: c.body,
    audioUrl: c.audioUrl,
    resolved: c.resolved,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    attachments: c.attachments,
    annotations: c.annotations,
    reactions: c.reactions,
    replies: c.replies.map(toHttp),
  }
}

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('customers/:customerId/tasks/:taskId/comments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class CommentsController {
  constructor(
    private readonly addComment: AddCommentUseCase,
    private readonly listComments: ListCommentsUseCase,
    private readonly resolveComment: ResolveCommentUseCase,
    private readonly reactToComment: ReactToCommentUseCase,
    private readonly deleteComment: DeleteCommentUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiBody({ type: AddCommentDto })
  @ApiResponse({ status: 201 })
  async add(
    @Param('taskId') taskId: string,
    @Body() body: AddCommentDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.addComment.execute({ taskId, authorUserId: user.userId, body: body.body, audioUrl: body.audioUrl, parentId: body.parentId })
    return { commentId: result.value.commentId }
  }

  @Get()
  @ApiOperation({ summary: 'List comments for a task' })
  @ApiParam({ name: 'customerId', type: String })
  @ApiParam({ name: 'taskId', type: String })
  @ApiResponse({ status: 200 })
  async list(@Param('taskId') taskId: string) {
    const result = await this.listComments.execute({ taskId })
    return { comments: result.value.comments.map(toHttp) }
  }

  @Patch(':commentId/resolve')
  @ApiOperation({ summary: 'Mark comment as resolved' })
  @ApiParam({ name: 'commentId', type: String })
  @ApiResponse({ status: 200 })
  @HttpCode(200)
  async resolve(@Param('commentId') commentId: string) {
    const result = await this.resolveComment.execute({ commentId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  @Post(':commentId/reactions')
  @ApiOperation({ summary: 'Toggle emoji reaction on a comment' })
  @ApiParam({ name: 'commentId', type: String })
  @ApiBody({ type: ReactDto })
  @ApiResponse({ status: 201 })
  async react(
    @Param('commentId') commentId: string,
    @Body() body: ReactDto,
    @CurrentUser() user: { userId: string },
  ) {
    await this.reactToComment.execute({ commentId, userId: user.userId, emoji: body.emoji, toggle: body.toggle })
  }

  @Delete(':commentId')
  @ApiOperation({ summary: 'Soft delete a comment' })
  @ApiParam({ name: 'commentId', type: String })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  async remove(@Param('commentId') commentId: string) {
    const result = await this.deleteComment.execute({ commentId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }
}
