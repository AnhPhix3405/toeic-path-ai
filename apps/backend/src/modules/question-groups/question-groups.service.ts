import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { QuestionResponseDto } from '../questions/dto/question-response.dto';
import { Question } from '../questions/entities/question.entity';
import type { CreateQuestionGroupDto } from './dto/create-question-group.dto';
import type { QuestionGroupResponseDto } from './dto/question-group-response.dto';
import type { UpdateQuestionGroupDto } from './dto/update-question-group.dto';
import { QuestionGroup } from './entities/question-group.entity';

@Injectable()
export class QuestionGroupsService {
  constructor(
    @InjectRepository(QuestionGroup)
    private readonly questionGroupsRepository: Repository<QuestionGroup>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateQuestionGroupDto, creatorId: string): Promise<QuestionGroupResponseDto> {
    const questionGroup = await this.questionGroupsRepository.save(
      this.questionGroupsRepository.create({ ...dto, createdBy: creatorId }),
    );
    return this.toResponse(questionGroup, []);
  }

  async findAll(): Promise<QuestionGroupResponseDto[]> {
    const questionGroups = await this.questionGroupsRepository.find({
      order: { createdAt: 'DESC' },
    });
    return questionGroups.map((questionGroup) => this.toResponse(questionGroup, []));
  }

  async findOne(id: string): Promise<QuestionGroupResponseDto> {
    const questionGroup = await this.findRequired(id, true);
    return this.toResponse(questionGroup, questionGroup.questions);
  }

  async update(
    id: string,
    dto: UpdateQuestionGroupDto,
    actorId: string,
  ): Promise<QuestionGroupResponseDto> {
    const questionGroup = await this.findRequired(id);
    this.assertOwner(questionGroup, actorId);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one question group field is required');
    }
    const updated = await this.questionGroupsRepository.save(
      this.questionGroupsRepository.merge(questionGroup, dto),
    );
    return this.toResponse(updated, []);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const questionGroup = await this.findRequired(id);
    this.assertOwner(questionGroup, actorId);
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        Question,
        { questionGroupId: questionGroup.id },
        { questionGroupId: null, groupOrder: null },
      );
      await manager.delete(QuestionGroup, questionGroup.id);
    });
  }

  async ensureExists(id: string): Promise<void> {
    await this.findRequired(id);
  }

  private async findRequired(id: string, withQuestions = false): Promise<QuestionGroup> {
    const queryBuilder = this.questionGroupsRepository
      .createQueryBuilder('questionGroup')
      .where('questionGroup.id = :id', { id });
    if (withQuestions) {
      queryBuilder
        .leftJoinAndSelect('questionGroup.questions', 'question')
        .leftJoinAndSelect('question.part', 'part')
        .leftJoinAndSelect('question.topics', 'topic')
        .leftJoinAndSelect('question.skills', 'skill')
        .orderBy('question.groupOrder', 'ASC');
    }
    const questionGroup = await queryBuilder.getOne();
    if (!questionGroup) throw new NotFoundException('Question group not found');
    return questionGroup;
  }

  private assertOwner(questionGroup: QuestionGroup, actorId: string): void {
    if (questionGroup.createdBy !== actorId) {
      throw new ForbiddenException('You can only modify question groups created by yourself');
    }
  }

  private toResponse(
    questionGroup: QuestionGroup,
    questions: Question[],
  ): QuestionGroupResponseDto {
    return {
      id: questionGroup.id,
      title: questionGroup.title,
      context: questionGroup.context,
      createdAt: questionGroup.createdAt,
      updatedAt: questionGroup.updatedAt,
      questions: questions.map((question) => this.toQuestionResponse(question)),
    };
  }

  private toQuestionResponse(question: Question): QuestionResponseDto {
    return {
      id: question.id,
      content: question.content,
      questionType: question.questionType,
      status: question.status,
      groupOrder: question.groupOrder,
      explanation: question.explanation,
      options: [],
      part: question.part
        ? {
            id: question.part.id,
            partNumber: question.part.partNumber,
            name: question.part.name,
            description: question.part.description,
          }
        : null,
      difficulty: question.difficulty ?? null,
      topics: (question.topics ?? [])
        .sort((first, second) => first.name.localeCompare(second.name))
        .map(({ id, name, description }) => ({ id, name, description })),
      skills: (question.skills ?? [])
        .sort((first, second) => first.name.localeCompare(second.name))
        .map(({ id, name, description }) => ({ id, name, description })),
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }
}
