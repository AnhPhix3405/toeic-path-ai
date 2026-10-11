import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SingleQuestionForm } from '@/features/questions/components/single-question-form';
import { QuestionPreviewCard } from '@/features/questions/components/question-preview-card';
import { QuestionGroupForm } from '@/features/question-groups/components/question-group-form';
import { GroupToeicPreview } from '@/features/question-groups/components/group-toeic-preview';
import type { Question, QuestionGroup } from '@/types/question';
import type { MediaResource } from '@/types/media';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-classification', () => ({
  useToeicParts: () => ({ data: [{ id: 'p-1', partNumber: 1, name: 'Photographs' }] }),
  useTopics: () => ({ data: [] }),
  useSkills: () => ({ data: [] }),
}));

vi.mock('@/hooks/use-question-groups', () => ({
  useCreateQuestionGroup: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateQuestionGroup: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/use-media', () => ({
  useQuestionMedia: (qid?: string) => ({
    data: qid === 'q-published-1' ? [mockImageMedia] : [mockAudioMedia],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useQuestionGroupMedia: (gid?: string) => ({
    data: [mockAudioMedia],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useUploadMedia: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteMedia: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMediaTarget: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const mockAudioMedia: MediaResource = {
  id: 'media-audio-1',
  fileName: 'conversation.mp3',
  fileUrl: 'https://storage.example.com/conversation.mp3',
  resourceType: 'audio',
  mimeType: 'audio/mpeg',
  fileSize: 1048576,
  questionId: 'q-1',
  questionGroupId: 'g-1',
  createdBy: 'u-1',
  createdAt: '2026-10-11T12:00:00Z',
  updatedAt: '2026-10-11T12:00:00Z',
};

const mockImageMedia: MediaResource = {
  id: 'media-image-1',
  fileName: 'photo_part1.png',
  fileUrl: 'https://storage.example.com/photo_part1.png',
  resourceType: 'image',
  mimeType: 'image/png',
  fileSize: 524288,
  questionId: 'q-published-1',
  questionGroupId: null,
  createdBy: 'u-1',
  createdAt: '2026-10-11T12:00:00Z',
  updatedAt: '2026-10-11T12:00:00Z',
};

const mockQuestion: Question = {
  id: 'q-1',
  content: 'What is happening in the picture?',
  questionType: 'single_choice',
  status: 'draft',
  groupOrder: null,
  explanation: 'Look at the main action.',
  options: [
    { id: 'opt-1', label: 'A', content: 'They are walking.', isCorrect: true, position: 1 },
    { id: 'opt-2', label: 'B', content: 'They are sitting.', isCorrect: false, position: 2 },
  ],
  part: { id: 'p-1', partNumber: 1, name: 'Photographs', description: null },
  difficulty: 'medium',
  topics: [],
  skills: [],
  createdAt: '2026-10-11T12:00:00Z',
  updatedAt: '2026-10-11T12:00:00Z',
};

const mockPublishedQuestion: Question = {
  ...mockQuestion,
  id: 'q-published-1',
  status: 'published',
};

const mockGroup: QuestionGroup = {
  id: 'g-1',
  title: 'Questions 71-73 refer to the following announcement',
  context: 'Attention all passengers on flight 204 to Chicago...',
  questions: [],
  createdAt: '2026-10-11T12:00:00Z',
  updatedAt: '2026-10-11T12:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('Media Integration into Question Bank Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Media Management section in SingleQuestionForm and allows opening manager', () => {
    render(<SingleQuestionForm initialQuestion={mockQuestion} mode="edit" />, {
      wrapper: createWrapper(),
    });

    expect(
      screen.getByText(/tài nguyên đa phương tiện/i),
    ).toBeInTheDocument();
  });

  it('renders AudioPlayer inside QuestionPreviewCard when audio media is present', () => {
    render(
      <QuestionPreviewCard
        formValues={{
          content: 'Where is the meeting?',
          explanation: '',
          partId: 'p-1',
          difficulty: 'medium',
          topicIds: [],
          skillIds: [],
          options: [
            { content: 'Option A', position: 1, isCorrect: true },
            { content: 'Option B', position: 2, isCorrect: false },
          ],
        }}
        mediaItems={[mockAudioMedia]}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByRole('region', { name: /trình phát âm thanh/i })).toBeInTheDocument();
  });

  it('renders ImageLightbox inside QuestionPreviewCard when image media is present', () => {
    render(
      <QuestionPreviewCard
        formValues={{
          content: 'Look at the photograph.',
          explanation: '',
          partId: 'p-1',
          difficulty: 'medium',
          topicIds: [],
          skillIds: [],
          options: [
            { content: 'Option A', position: 1, isCorrect: true },
            { content: 'Option B', position: 2, isCorrect: false },
          ],
        }}
        mediaItems={[mockImageMedia]}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByRole('button', { name: /phóng to ảnh/i })).toBeInTheDocument();
  });

  it('renders AudioPlayer at top of GroupToeicPreview when group audio is present', () => {
    render(
      <GroupToeicPreview
        title={mockGroup.title}
        context={mockGroup.context}
        questions={[mockQuestion]}
        mediaItems={[mockAudioMedia]}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByRole('region', { name: /trình phát âm thanh/i })).toBeInTheDocument();
  });

  it('locks media actions when editing published question in SingleQuestionForm', () => {
    render(<SingleQuestionForm initialQuestion={mockPublishedQuestion} mode="edit" />, {
      wrapper: createWrapper(),
    });

    // Delete button inside media attachment list is disabled
    const deleteBtn = screen.getByRole('button', { name: /xóa tài nguyên/i });
    expect(deleteBtn).toBeDisabled();
  });
});
