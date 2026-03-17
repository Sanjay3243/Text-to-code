# Jarvis Dataset Plan

## Goal

Build a practical dataset structure to improve Jarvis through better prompts, retrieval, memory, evaluation, and later fine-tuning if needed.

## Core Data Buckets

### 1. Conversations

Store interaction quality and assistant behavior.

Fields:
- `id`
- `timestamp`
- `user_message`
- `assistant_reply`
- `detected_intent`
- `language`
- `context_summary`
- `tool_used`
- `outcome`
- `user_feedback`

### 2. Tasks

Store execution-oriented actions and results.

Fields:
- `id`
- `timestamp`
- `task_type`
- `command`
- `tool_name`
- `input_payload`
- `output_summary`
- `status`
- `error_message`

### 3. Preferences

Store user-specific behavior settings.

Fields:
- `user_id`
- `preferred_language`
- `preferred_voice`
- `auto_speak_enabled`
- `auto_refresh_time_enabled`
- `favorite_tools`
- `interaction_style`

### 4. Feedback

Store corrections and quality signals.

Fields:
- `id`
- `timestamp`
- `original_prompt`
- `assistant_output`
- `corrected_output`
- `feedback_type`
- `notes`

## Immediate Use Cases

1. Improve response quality for common user intents.
2. Reduce generic or lecture-style replies.
3. Improve multilingual reply consistency.
4. Improve desktop action routing.
5. Improve voice transcription evaluation and retry logic.

## Recommended Implementation Order

1. Start storing structured conversation logs.
2. Add task execution logging for desktop tools and assistant actions.
3. Add preference persistence for language, voice, and controller settings.
4. Add feedback capture for incorrect responses.
5. Use this data for retrieval and response-quality evaluation.
6. Consider fine-tuning only after enough high-quality examples are collected.

## Practical Next Build Tasks

1. Create a local JSON or database-backed interaction log.
2. Save assistant actions and outcomes after each task.
3. Add a simple feedback action: good reply / bad reply / corrected reply.
4. Add preference persistence for voice and language settings.
5. Build a small evaluation report for failed and corrected responses.
