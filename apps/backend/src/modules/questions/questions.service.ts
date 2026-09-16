import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateQuestionDto } from './dto/create-question.dto';
import type { QuestionResponseDto } from './dto/question-response.dto';
import type { UpdateQuestionDto } from './dto/update-question.dto';
import { Question } from './entities/question.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
  ) {}

  async create(dto: CreateQuestionDto, creatorId: string): Promise<QuestionResponseDto> {
    const question = await this.questionsRepository.save(
      this.questionsRepository.create({ ...dto, createdBy: creatorId }),
    );
    return this.toResponse(question);
  }

  async findAll(): Promise<QuestionResponseDto[]> {
    const questions = await this.questionsRepository.find({ order: { createdAt: 'DESC' } });
    return questions.map((question) => this.toResponse(question));
  }

  async findOne(id: string): Promise<QuestionResponseDto> {
    return this.toResponse(await this.findRequired(id));
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

  private async findRequired(id: string): Promise<Question> {
    const question = await this.questionsRepository.findOneBy({ id });
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
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }
}
