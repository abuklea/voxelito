<goal>
You are an AI-engineer tasked with breaking down a complicated technical specification into detailed steps that retain a high-degree of granularity based on the original specifications.

<task>
Your goal is to generate a highly-detailed, step-wise task plan that leaves no detail un-addressed.
You should pass-back-through your output several times to ensure no data is left out.

The main context for this task is provided in the Context section below, namely:
- The tech specification
- Any critical project rules
- The core application intent documentation

Wrap your thought process in <thinking> tags.

## Core Instructions, rules, and Requirements

- **MANDATORY**: Use appropriate AGENTS and **subagents** for all tasks
- **CRITICAL**: Always use forward slashes (`/`) for paths, never backslashes
- Virtual environment at project root: `.venv/`, not `/backend/`
- PRP documentations and outputs (guides, working documents) to be placed in folder: `./PRPs/docs`
- You _MUST_ create an initial PRP start report (`*-INITIAL.md`) that details the plan for executing the PRP
- You _MUST_ create a PRP completion report (`*-REPORT.md`) as a final outcome as per instructions
- PRP start (`*-INITIAL.md`) and completion (`*-REPORT.md`) reports are to be placed in folder: `PRPs/reports`
- Any other project testing/debugging/working files go in `./wip` folder:
  - Use consistently formatted and informative file naming
  - prefix with task number/code of range of related tasks, T,  (e.g. T211-taskname, T110-T112-taskname, ...)
  - use lower hyphen case, EXAMPLES:
    - T417-T420-validation-testing-guide.md
    - T118-band-management-test-report.md
    - T320-T321-integration-testing-completion-summary.md

- The server is using HMR. Don't keep starting new servers UNLESS NECESSARY!
- **ALWAYS** stop any running servers before starting (or restarting) any frontend and/or backend servers, and only do so if required and not already running.

## Development Rules
- **ALWAYS use subagents** for complex tasks, and parallelize tasks when possible
- **Quality**: Run lint/typecheck before commits, and plan/iterate to remove errors
- **Database**: ALWAYS test migration up/down cycles before database commits

## Specific Preferences
- Prefer async/await
- Asynchronous operations within synchronous-looking function signatures, such as the Supabase server client's cookie handling, must be carefully managed to avoid `await` misuse.

CRITICAL: 
- Identify any parallelizable tasks that could be implemented/executed simultaneously, to be executed using appropriate specialized subagents (first identify discrete agent types, ~6 that would realistically execute each broad type of task, the "ai agent team", where each member has expert, targeted/specific skills and knowledge/access, to plan and execute the assigned task successfully to match the requirements - note: use a consistent but obvious/descriptive agent id to record in the task `assignee` field).. set each task's Assignee field to the intended agent type (i.e. with capable skillset)
- For each task, identify discrete tasks or collections of related tasks (and sequences of tasks) that are suitable for parallelization, and mark each task with `[P]` (this will be used to schedule and run multiple subagents simultaneously).
- Make sure the `assignee` of each task is set to the most-suitable/most-aligned agent to complete each task.
- Provide a lean but complete foundation for the task within the task description:
	- A clear task goal and success criteria, with error handling and fallback guidance
	- Extensive relevant details and context to complete the task
	- Indicate any task dependencies or pre-requisite resources, configurations, or prior-work
	- Suggest if task is suitable for parallelization (mark task title with `[P]`) , and any particular task sequence requirements
	- Specify intended task sequence, scope, and code-base influence
	- Include references to any required/useful project documents, or external sources
	- Note to share markdown files if necessary written to folder: `wip/`
	- Return a comprehensive and complete report with all task results, challenges, blockers, and/or outputs
</goal>

<format>
# {{project-title}} - Implementation Plan

## [Section N]
- Step 1: [Brief title]
  - **Task**: [Detailed explanation of what needs to be implemented]
  - **Files**: [Maximum of 15 files, ideally less]
    - `path/to/file1.ts`: [Description of changes]
  - **Step Dependencies**: [Step Dependencies]
  - **User Instructions**: [Instructions for User]

## [Section N + 1]
## [Section N + 2]

Repeat for all steps.

</format>
</task>
<context>
<warnings-and-guidelines>
- You ARE allowed to mix backend and frontend steps together, IF it makes sense.
- Each step must not modify more then 15 files in a single-run. If it does, you need to ask the user for permission and explain why, as it’s a special case.
- Always start with project setup, core initializations, and critical-path configurations.
- Aim to make each new step self-contained, so that the app can be built and be functional, for test and review between tasks.
- ALWAYS mark dependencies and update task tracking states between implementation steps.
</warnings-and-guidelines>
<core-app-intent>{{BRIEF}}</core-app-intent>
<tech-specification>{{TECH}}</tech-specification>
<project-rules>
# Git Workflow

## Branch Strategy
- **`master`** - Production-ready stable code
- **`dev`** - Main development branch (current working branch) 
- **`feature/feature-name`** - Individual feature development

## Development Commands

```bash
# Start new feature development
git checkout dev && git pull origin dev
git checkout -b feature/your-feature-name

# Development workflow
git add . && git commit -m "feat: {description}"
git push -u origin feature/your-feature-name

# Complete feature (merge to dev)
git checkout dev && git merge feature/your-feature-name
git push origin dev && git branch -d feature/your-feature-name

# NEVER include Claude Code sign-off or signature in commit messages.
# Use: [feat/remove/refactor/style/fix/chore/plan/docs/optimise] prefixes and other standards as appropriate
```

### Task completion and source tracking (git)
1. BEFORE task completion:
- Run any required tests test suites, and fix any errors
- Re-run the tests after each update/fix, and iterate to fix errors/issues
- Verify test coverage of primary files, systems, and functions, meets 80%+
- Make sure any fixes don't introduce new errors or unrelated issues, or break other tests for other fixes.
- Run additional checks specific to primary files (linting, type checking, etc.)

2. AFTER task completion, commit the completed task and any successful result/changes to git:
- Stage all required unstaged changes to git for this commit
- Develop a lean but detailed commit <message> that presents all changes in the commit as a list, e.g.:
```
fix: error from xyz fixed and feature online
  - This change
    - Issues encountered, etc
  - That change
    - Project effect, etc
```  
- **NEVER** add any author or sign-off into the commit message.
- Use commit subject prefixes, `<prefix>: <log>` from [feat/remove/refactor/style/fix/chore/plan/assets/samples/docs/optimise]. EXAMPLES: "chore: reversing a silly mistake", "style: updating theme consistency", "plan: a new feature for xyz", "remove: deleted supersceded implementation", etc ...)
- Generate a git commit <message> based on `git diff` and commit the staged changes:
```
Bash(git add .)
Bash(git diff --staged)
Bash(git commit -m "<message>")
```
</project-rules>

</context>
