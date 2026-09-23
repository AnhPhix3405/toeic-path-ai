import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import type { AssignQuestionGroupDto } from './dto/assign-question-group.dto';
import type { CreateQuestionDto } from './dto/create-question.dto';
import type { QuestionResponseDto } from './dto/question-response.dto';
import type { UpdateQuestionDto } from './dto/update-question.dto';
import { Question } from './entities/question.entity';
import { QuestionGroupsService } from '../question-groups/question-groups.service';
import type { CreateQuestionOptionDto } from './dto/create-question-option.dto';
import type { QuestionOptionResponseDto } from './dto/question-option-response.dto';
import type { SetCorrectAnswerDto } from './dto/set-correct-answer.dto';
import type { UpdateQuestionOptionDto } from './dto/update-question-option.dto';
import { QuestionOption } from './entities/question-option.entity';
import { ToeicPart } from './entities/toeic-part.entity';
import { Topic } from './entities/topic.entity';
import { Skill } from './entities/skill.entity';
import type { UpdateQuestionClassificationDto } from './dto/update-question-classification.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly questionOptionsRepository: Repository<QuestionOption>,
    private readonly questionGroupsService: QuestionGroupsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateQuestionDto, creatorId: string): Promise<QuestionResponseDto> {
    const question = await this.questionsRepository.save(
      this.questionsRepository.create({ ...dto, createdBy: creatorId }),
    );
    return this.toResponse(question);
  }

  async findAll(): Promise<QuestionResponseDto[]> {
    const questions = await this.questionsRepository.find({
      relations: { options: true, part: true, topics: true, skills: true },
      order: { createdAt: 'DESC', options: { position: 'ASC' } },
    });
    return questions.map((question) => this.toResponse(question));
  }

  async findOne(id: string): Promise<QuestionResponseDto> {
    const question = await this.questionsRepository.findOne({
      where: { id },
      relations: { options: true, part: true, topics: true, skills: true },
      order: { options: { position: 'ASC' } },
    });
    if (!question) throw new NotFoundException('Question not found');
    return this.toResponse(question);
  }

  async update(id: string, dto: UpdateQuestionDto, actorId: string): Promise<QuestionResponseDto> {
    const question = await this.findRequired(id);
    this.assertOwner(question, actorId);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one question field is required');
    }
    const updated = await this.questionsRepository.save(
      this.questionsRepository.merge(question, dto),
    );
    return this.toResponse(updated);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const question = await this.findRequired(id);
    this.assertOwner(question, actorId);
    await this.questionsRepository.remove(question);
  }

  async updateClassification(
    id: string,
    dto: UpdateQuestionClassificationDto,
    actorId: string,
  ): Promise<QuestionResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const question = await manager.findOne(Question, {
        where: { id },
        relations: { topics: true, skills: true },
      });
      if (!question) throw new NotFoundException('Question not found');
      this.assertOwner(question, actorId);

      const part = await manager.findOneBy(ToeicPart, { id: dto.partId });
      const topics = await manager.findBy(Topic, { id: In(dto.topicIds) });
      const skills = await manager.findBy(Skill, { id: In(dto.skillIds) });
      if (!part) throw new BadRequestException('TOEIC part does not exist');
      if (topics.length !== dto.topicIds.length) {
        throw new BadRequestException('One or more topics do not exist');
      }
      if (skills.length !== dto.skillIds.length) {
        throw new BadRequestException('One or more skills do not exist');
      }

      question.partId = part.id;
      question.part = part;
      question.difficulty = dto.difficulty;
      question.topics = topics;
      question.skills = skills;
      await manager.save(Question, question);
    });

    return this.findOne(id);
  }

  async assignGroup(
    id: string,
    dto: AssignQuestionGroupDto,
    actorId: string,
  ): Promise<QuestionResponseDto> {
    const question = await this.findRequired(id);
    this.assertOwner(question, actorId);
    await this.questionGroupsService.ensureExists(dto.questionGroupId);

    const conflictingQuestion = await this.questionsRepository.findOneBy({
      questionGroupId: dto.questionGroupId,
      groupOrder: dto.groupOrder,
    });
    if (conflictingQuestion && conflictingQuestion.id !== question.id) {
      throw new ConflictException('Question group order is already in use');
    }

    try {
      const updated = await this.questionsRepository.save(
        this.questionsRepository.merge(question, {
          questionGroupId: dto.questionGroupId,
          groupOrder: dto.groupOrder,
        }),
      );
      return this.toResponse(updated);
    } catch (error: unknown) {
      if (error instanceof QueryFailedError) {
        throw new ConflictException('Question group order is already in use');
      }
      throw error;
    }
  }

  async detachGroup(id: string, actorId: string): Promise<QuestionResponseDto> {
    const question = await this.findRequired(id);
    this.assertOwner(question, actorId);
    const updated = await this.questionsRepository.save(
      this.questionsRepository.merge(question, { questionGroupId: null, groupOrder: null }),
    );
    return this.toResponse(updated);
  }

  async createOption(
    questionId: string,
    dto: CreateQuestionOptionDto,
    actorId: string,
  ): Promise<QuestionOptionResponseDto> {
    const question = await this.findRequired(questionId);
    this.assertOwner(question, actorId);
    try {
      return await this.dataSource.transaction(async (manager) => {
        if (dto.isCorrect) {
          await manager.update(QuestionOption, { questionId }, { isCorrect: false });
        }
        const option = await manager.save(
          manager.create(QuestionOption, {
            questionId,
            content: dto.content,
            position: dto.position,
            label: this.labelForPosition(dto.position),
            isCorrect: dto.isCorrect ?? false,
          }),
        );
        return this.toOptionResponse(option);
      });
    } catch (error: unknown) {
      this.rethrowOptionConflict(error);
    }
  }

  async updateOption(
    questionId: string,
    optionId: string,
    dto: UpdateQuestionOptionDto,
    actorId: string,
  ): Promise<QuestionOptionResponseDto> {
    const question = await this.findRequired(questionId);
    this.assertOwner(question, actorId);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one option field is required');
    }
    const option = await this.findOptionRequired(questionId, optionId);
    try {
      return await this.dataSource.transaction(async (manager) => {
        if (dto.isCorrect) {
          await manager.update(QuestionOption, { questionId }, { isCorrect: false });
        }
        const position = dto.position ?? option.position;
        const updated = await manager.save(
          manager.merge(QuestionOption, option, {
            ...dto,
            position,
            label: this.labelForPosition(position),
          }),
        );
        return this.toOptionResponse(updated);
      });
    } catch (error: unknown) {
      this.rethrowOptionConflict(error);
    }
  }

  async removeOption(questionId: string, optionId: string, actorId: string): Promise<void> {
    const question = await this.findRequired(questionId);
    this.assertOwner(question, actorId);
    const option = await this.findOptionRequired(questionId, optionId);
    await this.questionOptionsRepository.remove(option);
  }

  async setCorrectAnswer(
    questionId: string,
    dto: SetCorrectAnswerDto,
    actorId: string,
  ): Promise<QuestionOptionResponseDto> {
    const question = await this.findRequired(questionId);
    this.assertOwner(question, actorId);
    const option = await this.findOptionRequired(questionId, dto.optionId);
    const updated = await this.dataSource.transaction(async (manager) => {
      await manager.update(QuestionOption, { questionId }, { isCorrect: false });
      return manager.save(QuestionOption, { ...option, isCorrect: true });
    });
    return this.toOptionResponse(updated);
  }

  private async findRequired(id: string): Promise<Question> {
    const question = await this.questionsRepository.findOne({
      where: { id },
      relations: { options: true, part: true, topics: true, skills: true },
      order: { options: { position: 'ASC' } },
    });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  private assertOwner(question: Question, actorId: string): void {
    if (question.createdBy !== actorId) {
      throw new ForbiddenException('You can only modify questions created by yourself');
    }
  }

  private toResponse(question: Question): QuestionResponseDto {
    return {
      id: question.id,
      content: question.content,
      questionType: question.questionType,
      status: question.status,
      groupOrder: question.groupOrder,
      explanation: question.explanation,
      options: (question.options ?? [])
        .sort((first, second) => first.position - second.position)
        .map((option) => this.toOptionResponse(option)),
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

  private async findOptionRequired(questionId: string, optionId: string): Promise<QuestionOption> {
    const option = await this.questionOptionsRepository.findOneBy({ id: optionId, questionId });
    if (!option) throw new NotFoundException('Question option not found');
    return option;
  }

  private labelForPosition(position: number): string {
    let remaining = position;
    let label = '';
    while (remaining > 0) {
      remaining -= 1;
      label = String.fromCharCode(65 + (remaining % 26)) + label;
      remaining = Math.floor(remaining / 26);
    }
    return label;
  }

  private toOptionResponse(option: QuestionOption): QuestionOptionResponseDto {
    return {
      id: option.id,
      label: option.label,
      content: option.content,
      isCorrect: option.isCorrect,
      position: option.position,
    };
  }

  private rethrowOptionConflict(error: unknown): never {
    if (error instanceof QueryFailedError) {
      throw new ConflictException('Question option position conflicts with an existing option');
    }
    throw error;
  }
}
