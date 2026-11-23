"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Eye,
  FileDiff,
  History,
  Layers,
  Loader2,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuestionDifficultyBadge } from "@/features/questions/components/question-difficulty-badge";
import { QuestionStatusBadge } from "@/features/questions/components/question-status-badge";
import { AudioPlayer } from "@/features/media/components/audio-player";
import { ImageLightbox } from "@/features/media/components/image-lightbox";
import {
  useQuestionGroupMedia,
  useQuestionMedia,
} from "@/hooks/use-media";
import {
  useApproveQuestion,
  useQuestionHistories,
  useQuestionReviewLogs,
  useQuickFixApprove,
  useRejectQuestion,
  useRequestRevision,
} from "@/hooks/use-question-reviews";
import {
  QuickFixValidationResult,
  validateQuickFixPayload,
} from "@/lib/validations/question-review.schema";
import { Question } from "@/types/question";
import {
  FeedbackActionModal,
  OptimisticLockConflictModal,
} from "./review-decision-modals";
import { QuestionHistoryDiffViewer } from "./question-history-diff-viewer";
import { QuestionReviewTimeline } from "./question-review-timeline";

export interface ReviewSplitWorkspaceProps {
  question: Question;
  currentUserId?: string;
  currentUserRole?: "student" | "teacher" | "admin";
  onClose: () => void;
  onReviewCompleted: () => void;
  onReloadQuestion: () => void;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export function ReviewSplitWorkspace({
  question,
  currentUserId,
  currentUserRole = "teacher",
  onClose,
  onReviewCompleted,
  onReloadQuestion,
}: ReviewSplitWorkspaceProps) {
  const approveMutation = useApproveQuestion();
  const quickFixMutation = useQuickFixApprove();
  const requestRevisionMutation = useRequestRevision();
  const rejectMutation = useRejectQuestion();

  const { data: questionMedia } = useQuestionMedia(question.id);
  const { data: groupMedia } = useQuestionGroupMedia(
    question.questionGroupId || undefined
  );
  const { data: histories, isLoading: isHistoriesLoading } =
    useQuestionHistories(question.id);
  const { data: reviewLogs, isLoading: isLogsLoading } =
    useQuestionReviewLogs(question.id);

  // Mode & Decision state (automatically reset by parent key={`${question.id}-${question.version}`})
  const [isQuickFixMode, setIsQuickFixMode] = useState(false);
  const [emergencyBypass, setEmergencyBypass] = useState(false);
  const [approvalFeedback, setApprovalFeedback] = useState("");
  const [historyTab, setHistoryTab] = useState<"timeline" | "diff">("timeline");

  // Quick-Fix editable state
  const [draftContent, setDraftContent] = useState<string>(
    question.content ?? ""
  );
  const [draftExplanation, setDraftExplanation] = useState<string>(
    question.explanation ?? ""
  );
  const [draftOptions, setDraftOptions] = useState(
    (question.options || []).map((opt, idx) => ({
      id: opt.id,
      label: opt.label || OPTION_LABELS[idx] || String.fromCharCode(65 + idx),
      content: opt.content ?? "",
      isCorrect: Boolean(opt.isCorrect),
    }))
  );
  const [quickFixErrors, setQuickFixErrors] =
    useState<QuickFixValidationResult | null>(null);

  // Modals state
  const [feedbackModalMode, setFeedbackModalMode] = useState<
    "revision" | "reject" | null
  >(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const isSelfCreated = Boolean(
    currentUserId && question.createdBy === currentUserId
  );
  const isAdmin = currentUserRole === "admin";
  const isActionBlockedByMakerChecker =
    isSelfCreated && !(isAdmin && emergencyBypass);

  const currentVersion = question.version ?? 1;
  const partNumber = question.part?.partNumber ?? null;

  const allMedia = [
    ...(groupMedia || []),
    ...(questionMedia || []),
  ];

  const handleErrorWithConflictCheck = (err: unknown) => {
    if (
      typeof err === "object" &&
      err !== null &&
      (("statusCode" in err &&
        (err as { statusCode: number }).statusCode === 409) ||
        ("errorCode" in err &&
          (err as { errorCode: string }).errorCode ===
            "ERR_CONCURRENCY_CONFLICT"))
    ) {
      setIsConflictModalOpen(true);
    }
  };

  const handleDirectApprove = async () => {
    if (isActionBlockedByMakerChecker) return;
    if (approvalFeedback.trim().length > 2000) {
      setQuickFixErrors({
        isValid: false,
        feedbackError: "Nội dung ghi chú không được vượt quá 2.000 ký tự.",
        optionItemErrors: {},
      });
      return;
    }

    try {
      await approveMutation.mutateAsync({
        id: question.id,
        dto: {
          version: currentVersion,
          emergencyBypass: isSelfCreated && isAdmin ? emergencyBypass : undefined,
          feedback: approvalFeedback.trim() || undefined,
        },
      });
      onReviewCompleted();
    } catch (err) {
      handleErrorWithConflictCheck(err);
    }
  };

  const handleQuickFixAndApprove = async () => {
    if (isActionBlockedByMakerChecker) return;

    const validation = validateQuickFixPayload({
      partNumber,
      content: draftContent,
      options: draftOptions,
      feedback: approvalFeedback,
    });

    if (!validation.isValid) {
      setQuickFixErrors(validation);
      return;
    }

    setQuickFixErrors(null);

    try {
      await quickFixMutation.mutateAsync({
        id: question.id,
        dto: {
          version: currentVersion,
          content: draftContent.trim() === "" ? null : draftContent.trim(),
          explanation: draftExplanation.trim() || undefined,
          options: draftOptions.map((o) => ({
            id: o.id,
            content:
              !o.content || o.content.trim() === "" ? null : o.content.trim(),
            isCorrect: o.isCorrect,
          })),
          emergencyBypass: isSelfCreated && isAdmin ? emergencyBypass : undefined,
          feedback:
            approvalFeedback.trim() || "Reviewer sửa nhanh và phê duyệt",
        },
      });
      onReviewCompleted();
    } catch (err) {
      handleErrorWithConflictCheck(err);
    }
  };

  const handleConfirmFeedbackModal = async (payload: {
    feedback: string;
    applyToWholeGroup: boolean;
  }) => {
    try {
      if (feedbackModalMode === "revision") {
        await requestRevisionMutation.mutateAsync({
          id: question.id,
          dto: {
            version: currentVersion,
            feedback: payload.feedback,
            applyToWholeGroup: payload.applyToWholeGroup,
          },
        });
      } else if (feedbackModalMode === "reject") {
        await rejectMutation.mutateAsync({
          id: question.id,
          dto: {
            version: currentVersion,
            feedback: payload.feedback,
            applyToWholeGroup: payload.applyToWholeGroup,
          },
        });
      }
      setFeedbackModalMode(null);
      onReviewCompleted();
    } catch (err) {
      setFeedbackModalMode(null);
      handleErrorWithConflictCheck(err);
    }
  };

  const isMutating =
    approveMutation.isPending ||
    quickFixMutation.isPending ||
    requestRevisionMutation.isPending ||
    rejectMutation.isPending;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/70 shadow-md overflow-hidden">
      {/* Workspace Top Bar */}
      <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge
            variant="secondary"
            className="text-xs font-semibold px-2.5 py-0.5"
          >
            {question.part
              ? `Part ${question.part.partNumber}: ${question.part.name}`
              : "Chưa phân loại Part"}
          </Badge>
          <QuestionDifficultyBadge difficulty={question.difficulty} />
          <QuestionStatusBadge status={question.status} />
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-semibold">
            Phiên bản v{currentVersion}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isQuickFixMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setIsQuickFixMode((prev) => !prev);
              setQuickFixErrors(null);
            }}
            className={`h-8 rounded-xl text-xs cursor-pointer ${
              isQuickFixMode
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : ""
            }`}
          >
            {isQuickFixMode ? (
              <>
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Chế độ Xem chuẩn
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                Sửa nhanh (Quick-Fix)
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 rounded-xl text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4 mr-1" />
            Đóng bàn thẩm định
          </Button>
        </div>
      </div>

      {/* Split-Screen Grid (Left 7 cols: Content + Media + Quick-Fix | Right 5 cols: Maker-Checker + Decision + History) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-7 p-6 space-y-6">
          {/* Creator Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Người biên soạn:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {question.creator?.fullName ||
                  question.creator?.email ||
                  question.createdBy ||
                  "Giáo viên"}
              </strong>
            </div>
            <span className="font-mono text-[11px]">ID: {question.id}</span>
          </div>

          {/* Group Passage Context (if belongs to QuestionGroup) */}
          {question.questionGroup && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Layers className="w-4 h-4" />
                <span>
                  Ngữ cảnh Nhóm câu hỏi:{" "}
                  {question.questionGroup.title || "Đoạn văn chung"}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {question.questionGroup.context}
              </p>
            </div>
          )}

          {/* Media Resources Preview (AudioPlayer & ImageLightbox from Task 1) */}
          {allMedia.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tài nguyên đa phương tiện đính kèm ({allMedia.length})
              </p>
              <div className="space-y-3">
                {allMedia.map((media) =>
                  media.resourceType === "audio" ? (
                    <AudioPlayer
                      key={media.id}
                      src={media.fileUrl}
                      fileName={media.fileName}
                      variant="compact"
                    />
                  ) : (
                    <ImageLightbox
                      key={media.id}
                      src={media.fileUrl}
                      fileName={media.fileName}
                      fileSize={media.fileSize}
                    />
                  )
                )}
              </div>
            </div>
          )}

          {/* Question Content (View vs Quick-Fix) */}
          <div className="space-y-2">
            <label
              htmlFor="quickfix-question-content"
              className="block text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400"
            >
              Nội dung câu hỏi
              {[1, 2, 6].includes(partNumber ?? 0) && (
                <span className="ml-1.5 text-[11px] font-normal text-slate-400">
                  (Tùy chọn đối với Part {partNumber})
                </span>
              )}
            </label>

            {isQuickFixMode ? (
              <div>
                <textarea
                  id="quickfix-question-content"
                  rows={3}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {quickFixErrors?.contentError && (
                  <p
                    role="alert"
                    className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{quickFixErrors.contentError}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                {question.content || (
                  <span className="italic text-sm font-normal text-slate-400">
                    (Câu hỏi không có văn bản riêng — nội dung nằm trong Audio
                    hoặc Đoạn văn nhóm)
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Options List (View vs Quick-Fix) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Phương án trả lời ({draftOptions.length})
              </span>
              {isQuickFixMode && (
                <span className="text-[11px] text-slate-500">
                  Nhấn vào chữ cái A/B/C/D để đổi đáp án đúng
                </span>
              )}
            </div>

            {quickFixErrors?.optionsError && (
              <p
                role="alert"
                className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{quickFixErrors.optionsError}</span>
              </p>
            )}

            <div className="space-y-2.5">
              {draftOptions.map((opt, idx) => {
                const itemErr = quickFixErrors?.optionItemErrors?.[opt.id];

                return (
                  <div key={opt.id || idx} className="space-y-1">
                    <div
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        opt.isCorrect
                          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                          : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!isQuickFixMode}
                        onClick={() => {
                          if (!isQuickFixMode) return;
                          setDraftOptions((prev) =>
                            prev.map((item) => ({
                              ...item,
                              isCorrect: item.id === opt.id,
                            }))
                          );
                        }}
                        aria-label={`Đặt phương án ${opt.label} làm đáp án đúng`}
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                          isQuickFixMode ? "cursor-pointer" : "cursor-default"
                        } ${
                          opt.isCorrect
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>

                      {isQuickFixMode ? (
                        <Input
                          value={opt.content}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftOptions((prev) =>
                              prev.map((item) =>
                                item.id === opt.id
                                  ? { ...item, content: val }
                                  : item
                              )
                            );
                          }}
                          placeholder={
                            [1, 2].includes(partNumber ?? 0)
                              ? `(Tùy chọn cho Part ${partNumber})`
                              : `Nhập nội dung phương án ${opt.label}...`
                          }
                          className="h-9 text-xs rounded-lg bg-white dark:bg-slate-900"
                        />
                      ) : (
                        <span className="flex-1 text-sm text-slate-800 dark:text-slate-200">
                          {opt.content || (
                            <span className="italic text-xs text-slate-400">
                              (Phương án nghe trong Audio)
                            </span>
                          )}
                        </span>
                      )}

                      {opt.isCorrect && (
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Đáp án đúng
                        </span>
                      )}
                    </div>

                    {itemErr && (
                      <p
                        role="alert"
                        className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pl-2"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{itemErr}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation (View vs Quick-Fix) */}
          <div className="space-y-2">
            <label
              htmlFor="quickfix-explanation"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Lời giải chi tiết
            </label>

            {isQuickFixMode ? (
              <textarea
                id="quickfix-explanation"
                rows={3}
                value={draftExplanation}
                onChange={(e) => setDraftExplanation(e.target.value)}
                placeholder="Nhập lời giải chi tiết cho câu hỏi..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {question.explanation || (
                  <span className="italic text-slate-400">
                    Chưa có lời giải chi tiết.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Maker-Checker Panel + Actions + History Tabs */}
        <div className="lg:col-span-5 p-6 space-y-6 bg-slate-50/40 dark:bg-slate-900/40">
          {/* Maker-Checker Warning & Admin Emergency Bypass (BR15.7 & E5) */}
          {isSelfCreated && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3">
              <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">
                    Quy tắc Maker-Checker (Chặn tự kiểm duyệt)
                  </p>
                  <p className="leading-relaxed">
                    Bạn là người biên soạn câu hỏi này nên không thể tự kiểm
                    duyệt. Vui lòng để Reviewer hoặc Giáo viên khác thẩm định.
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/80 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emergencyBypass}
                      onChange={(e) => setEmergencyBypass(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>
                      Kích hoạt quyền Admin Bypass khẩn cấp (emergencyBypass)
                    </span>
                  </label>
                  {emergencyBypass && (
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 p-2 rounded-lg border border-rose-200 dark:border-rose-800">
                      Cảnh báo: Thao tác này sẽ ghi nhận sự kiện bảo mật{" "}
                      <code className="font-mono font-bold">
                        ADMIN_REVIEW_BYPASS
                      </code>{" "}
                      vào Nhật ký Hệ thống (Security Audit Log).
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reviewer Action Panel */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Quyết định thẩm định
            </h3>

            <div>
              <label
                htmlFor="optional-approval-feedback"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Ghi chú thẩm định (Tùy chọn khi phê duyệt)
              </label>
              <Input
                id="optional-approval-feedback"
                value={approvalFeedback}
                onChange={(e) => setApprovalFeedback(e.target.value)}
                placeholder="Nhập ghi chú ngắn gọn (ví dụ: Đã kiểm tra chuẩn ETS)..."
                className="h-9 text-xs rounded-xl"
              />
              {quickFixErrors?.feedbackError && (
                <p
                  role="alert"
                  className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{quickFixErrors.feedbackError}</span>
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              {isQuickFixMode ? (
                <Button
                  type="button"
                  disabled={isActionBlockedByMakerChecker || isMutating}
                  onClick={handleQuickFixAndApprove}
                  className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-10 cursor-pointer"
                >
                  {quickFixMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Lưu sửa nhanh & Phê duyệt (published)
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isActionBlockedByMakerChecker || isMutating}
                  onClick={handleDirectApprove}
                  className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-10 cursor-pointer"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Phê duyệt ngay (published)
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isActionBlockedByMakerChecker || isMutating}
                  onClick={() => setFeedbackModalMode("revision")}
                  className="justify-center rounded-xl text-xs border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  Yêu cầu chỉnh sửa
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isActionBlockedByMakerChecker || isMutating}
                  onClick={() => setFeedbackModalMode("reject")}
                  className="justify-center rounded-xl text-xs border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Từ chối câu hỏi
                </Button>
              </div>
            </div>
          </div>

          {/* History & Audit Log Tabs (Task 4 Integration) */}
          <div className="space-y-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setHistoryTab("timeline")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-200 ${
                  historyTab === "timeline"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Nhật ký thẩm định ({reviewLogs?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab("diff")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-200 ${
                  historyTab === "diff"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <FileDiff className="w-3.5 h-3.5" />
                Lịch sử phiên bản Diff ({histories?.length || 0})
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto pr-1">
              {historyTab === "timeline" ? (
                <QuestionReviewTimeline
                  logs={reviewLogs || []}
                  isLoading={isLogsLoading}
                />
              ) : (
                <QuestionHistoryDiffViewer
                  histories={histories || []}
                  isLoading={isHistoriesLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Feedback Modal for Revision Request / Rejection */}
      <FeedbackActionModal
        open={feedbackModalMode !== null}
        mode={feedbackModalMode || "revision"}
        hasQuestionGroup={Boolean(question.questionGroupId)}
        isSubmitting={
          requestRevisionMutation.isPending || rejectMutation.isPending
        }
        onOpenChange={(open) => {
          if (!open) setFeedbackModalMode(null);
        }}
        onConfirm={handleConfirmFeedbackModal}
      />

      {/* Optimistic Locking 409 Conflict Modal */}
      <OptimisticLockConflictModal
        open={isConflictModalOpen}
        onOpenChange={setIsConflictModalOpen}
        onReloadLatest={onReloadQuestion}
      />
    </div>
  );
}
