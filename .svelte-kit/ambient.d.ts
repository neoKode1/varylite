
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const GITHUB_STATE: string;
	export const RIC_GATEWAY_URL: string;
	export const DOTNET_NOLOGO: string;
	export const OPENROUTER_API_KEY: string;
	export const USER: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const npm_config_user_agent: string;
	export const GIT_EDITOR: string;
	export const CI: string;
	export const USE_BAZEL_FALLBACK_VERSION: string;
	export const RUNNER_ENVIRONMENT: string;
	export const GITHUB_ENV: string;
	export const PIPX_HOME: string;
	export const npm_node_execpath: string;
	export const JAVA_HOME_8_X64: string;
	export const CLOUDFLARE_D1_TOKEN: string;
	export const SHLVL: string;
	export const AI_MODE: string;
	export const HOME: string;
	export const DOMAIN: string;
	export const RUNNER_TEMP: string;
	export const GITHUB_EVENT_PATH: string;
	export const USE_ORCHESTRATOR: string;
	export const JAVA_HOME_11_X64: string;
	export const PIPX_BIN_DIR: string;
	export const INSTALL_PHASE_START: string;
	export const GITHUB_REPOSITORY_OWNER: string;
	export const GRADLE_HOME: string;
	export const ANDROID_NDK_LATEST_HOME: string;
	export const JAVA_HOME_21_X64: string;
	export const GITHUB_RETENTION_DAYS: string;
	export const ADDON_CUBES_JSON: string;
	export const GITHUB_REPOSITORY_OWNER_ID: string;
	export const POWERSHELL_DISTRIBUTION_CHANNEL: string;
	export const AZURE_EXTENSION_DIR: string;
	export const GITHUB_HEAD_REF: string;
	export const WEBHOOK_SECRET: string;
	export const SYSTEMD_EXEC_PID: string;
	export const ACTIONS_ORCHESTRATION_ID: string;
	export const AI_CUSTOMIZE_PHASE_START: string;
	export const GITHUB_GRAPHQL_URL: string;
	export const JAVA_HOME_25_X64: string;
	export const NVM_DIR: string;
	export const CLOUDFLARE_ACCOUNT_ID: string;
	export const NPM_TOKEN: string;
	export const DOTNET_SKIP_FIRST_TIME_EXPERIENCE: string;
	export const JAVA_HOME_17_X64: string;
	export const ImageVersion: string;
	export const AGENTS_DIR: string;
	export const LOGNAME: string;
	export const RUNNER_OS: string;
	export const GITHUB_API_URL: string;
	export const ORCHESTRATOR_REGISTRY_SLUG: string;
	export const GOROOT_1_22_X64: string;
	export const SWIFT_PATH: string;
	export const CHROMEWEBDRIVER: string;
	export const GOROOT_1_23_X64: string;
	export const JOURNAL_STREAM: string;
	export const GITHUB_WORKFLOW: string;
	export const _: string;
	export const MEMORY_PRESSURE_WATCH: string;
	export const GOROOT_1_24_X64: string;
	export const npm_config_registry: string;
	export const ACTIONS_RUNNER_ACTION_ARCHIVE_CACHE: string;
	export const GOROOT_1_25_X64: string;
	export const GITHUB_RUN_ID: string;
	export const OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
	export const GITHUB_REF_TYPE: string;
	export const BOOTSTRAP_HASKELL_NONINTERACTIVE: string;
	export const CLONE_PHASE_START: string;
	export const GITHUB_WORKFLOW_SHA: string;
	export const GITHUB_BASE_REF: string;
	export const ImageOS: string;
	export const AI_TASK: string;
	export const GITHUB_WORKFLOW_REF: string;
	export const AI_PROVIDER: string;
	export const GITHUB_ACTION_REPOSITORY: string;
	export const ENABLE_RUNNER_TRACING: string;
	export const npm_config_node_gyp: string;
	export const PATH: string;
	export const ANTHROPIC_API_KEY: string;
	export const ANT_HOME: string;
	export const DOTNET_MULTILEVEL_LOOKUP: string;
	export const RUNNER_TRACKING_ID: string;
	export const INVOCATION_ID: string;
	export const RUNNER_TOOL_CACHE: string;
	export const PEGASUS_KNOWYOURMODEL_PUBLIC_KEY: string;
	export const npm_package_name: string;
	export const NODE: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const GITHUB_ACTION: string;
	export const GITHUB_RUN_NUMBER: string;
	export const GITHUB_TRIGGERING_ACTOR: string;
	export const RUNNER_ARCH: string;
	export const XDG_RUNTIME_DIR: string;
	export const AGENT_TOOLSDIRECTORY: string;
	export const npm_config_frozen_lockfile: string;
	export const PEGASUS_KNOWYOURMODEL_SIGNING_KEY: string;
	export const OWNER_ID: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const LANG: string;
	export const VCPKG_INSTALLATION_ROOT: string;
	export const CONDA: string;
	export const RUNNER_NAME: string;
	export const XDG_CONFIG_HOME: string;
	export const KYM_API_URL: string;
	export const GITHUB_REF_NAME: string;
	export const GITHUB_REPOSITORY: string;
	export const npm_lifecycle_script: string;
	export const DEPLOYMENT_ID: string;
	export const ANDROID_NDK_ROOT: string;
	export const GITHUB_ACTION_REF: string;
	export const DEBIAN_FRONTEND: string;
	export const DEPLOY_MODE: string;
	export const SHELL: string;
	export const GITHUB_REPOSITORY_ID: string;
	export const GITHUB_ACTIONS: string;
	export const PLATFORM_DIR: string;
	export const NODE_PATH: string;
	export const npm_package_version: string;
	export const npm_lifecycle_event: string;
	export const GITHUB_REF_PROTECTED: string;
	export const GITHUB_WORKSPACE: string;
	export const ACCEPT_EULA: string;
	export const GITHUB_JOB: string;
	export const GITHUB_SHA: string;
	export const CLAUDECODE: string;
	export const GITHUB_RUN_ATTEMPT: string;
	export const GITHUB_REF: string;
	export const GITHUB_ACTOR: string;
	export const ANDROID_SDK_ROOT: string;
	export const HERMES_URL: string;
	export const GITHUB_PATH: string;
	export const JAVA_HOME: string;
	export const PWD: string;
	export const GITHUB_ACTOR_ID: string;
	export const RUNNER_WORKSPACE: string;
	export const npm_execpath: string;
	export const HOMEBREW_CLEANUP_PERIODIC_FULL_DAYS: string;
	export const AI_SYSTEM_PROMPT: string;
	export const GITHUB_EVENT_NAME: string;
	export const HOMEBREW_NO_AUTO_UPDATE: string;
	export const ANDROID_HOME: string;
	export const GITHUB_SERVER_URL: string;
	export const GECKOWEBDRIVER: string;
	export const NVM_CD_FLAGS: string;
	export const XDG_DATA_DIRS: string;
	export const GHCUP_INSTALL_BASE_PREFIX: string;
	export const GITHUB_OUTPUT: string;
	export const EDGEWEBDRIVER: string;
	export const npm_command: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const ANDROID_NDK: string;
	export const SGX_AESM_ADDR: string;
	export const PSModulePath: string;
	export const CHROME_BIN: string;
	export const CUBI_CATEGORY: string;
	export const SELENIUM_JAR_PATH: string;
	export const MEMORY_PRESSURE_WRITE: string;
	export const PNPM_HOME: string;
	export const CLOUDFLARE_DEPLOY_TOKEN: string;
	export const ANDROID_NDK_HOME: string;
	export const GITHUB_STEP_SUMMARY: string;
	export const INIT_CWD: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		GITHUB_STATE: string;
		RIC_GATEWAY_URL: string;
		DOTNET_NOLOGO: string;
		OPENROUTER_API_KEY: string;
		USER: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		npm_config_user_agent: string;
		GIT_EDITOR: string;
		CI: string;
		USE_BAZEL_FALLBACK_VERSION: string;
		RUNNER_ENVIRONMENT: string;
		GITHUB_ENV: string;
		PIPX_HOME: string;
		npm_node_execpath: string;
		JAVA_HOME_8_X64: string;
		CLOUDFLARE_D1_TOKEN: string;
		SHLVL: string;
		AI_MODE: string;
		HOME: string;
		DOMAIN: string;
		RUNNER_TEMP: string;
		GITHUB_EVENT_PATH: string;
		USE_ORCHESTRATOR: string;
		JAVA_HOME_11_X64: string;
		PIPX_BIN_DIR: string;
		INSTALL_PHASE_START: string;
		GITHUB_REPOSITORY_OWNER: string;
		GRADLE_HOME: string;
		ANDROID_NDK_LATEST_HOME: string;
		JAVA_HOME_21_X64: string;
		GITHUB_RETENTION_DAYS: string;
		ADDON_CUBES_JSON: string;
		GITHUB_REPOSITORY_OWNER_ID: string;
		POWERSHELL_DISTRIBUTION_CHANNEL: string;
		AZURE_EXTENSION_DIR: string;
		GITHUB_HEAD_REF: string;
		WEBHOOK_SECRET: string;
		SYSTEMD_EXEC_PID: string;
		ACTIONS_ORCHESTRATION_ID: string;
		AI_CUSTOMIZE_PHASE_START: string;
		GITHUB_GRAPHQL_URL: string;
		JAVA_HOME_25_X64: string;
		NVM_DIR: string;
		CLOUDFLARE_ACCOUNT_ID: string;
		NPM_TOKEN: string;
		DOTNET_SKIP_FIRST_TIME_EXPERIENCE: string;
		JAVA_HOME_17_X64: string;
		ImageVersion: string;
		AGENTS_DIR: string;
		LOGNAME: string;
		RUNNER_OS: string;
		GITHUB_API_URL: string;
		ORCHESTRATOR_REGISTRY_SLUG: string;
		GOROOT_1_22_X64: string;
		SWIFT_PATH: string;
		CHROMEWEBDRIVER: string;
		GOROOT_1_23_X64: string;
		JOURNAL_STREAM: string;
		GITHUB_WORKFLOW: string;
		_: string;
		MEMORY_PRESSURE_WATCH: string;
		GOROOT_1_24_X64: string;
		npm_config_registry: string;
		ACTIONS_RUNNER_ACTION_ARCHIVE_CACHE: string;
		GOROOT_1_25_X64: string;
		GITHUB_RUN_ID: string;
		OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
		GITHUB_REF_TYPE: string;
		BOOTSTRAP_HASKELL_NONINTERACTIVE: string;
		CLONE_PHASE_START: string;
		GITHUB_WORKFLOW_SHA: string;
		GITHUB_BASE_REF: string;
		ImageOS: string;
		AI_TASK: string;
		GITHUB_WORKFLOW_REF: string;
		AI_PROVIDER: string;
		GITHUB_ACTION_REPOSITORY: string;
		ENABLE_RUNNER_TRACING: string;
		npm_config_node_gyp: string;
		PATH: string;
		ANTHROPIC_API_KEY: string;
		ANT_HOME: string;
		DOTNET_MULTILEVEL_LOOKUP: string;
		RUNNER_TRACKING_ID: string;
		INVOCATION_ID: string;
		RUNNER_TOOL_CACHE: string;
		PEGASUS_KNOWYOURMODEL_PUBLIC_KEY: string;
		npm_package_name: string;
		NODE: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		GITHUB_ACTION: string;
		GITHUB_RUN_NUMBER: string;
		GITHUB_TRIGGERING_ACTOR: string;
		RUNNER_ARCH: string;
		XDG_RUNTIME_DIR: string;
		AGENT_TOOLSDIRECTORY: string;
		npm_config_frozen_lockfile: string;
		PEGASUS_KNOWYOURMODEL_SIGNING_KEY: string;
		OWNER_ID: string;
		NoDefaultCurrentDirectoryInExePath: string;
		LANG: string;
		VCPKG_INSTALLATION_ROOT: string;
		CONDA: string;
		RUNNER_NAME: string;
		XDG_CONFIG_HOME: string;
		KYM_API_URL: string;
		GITHUB_REF_NAME: string;
		GITHUB_REPOSITORY: string;
		npm_lifecycle_script: string;
		DEPLOYMENT_ID: string;
		ANDROID_NDK_ROOT: string;
		GITHUB_ACTION_REF: string;
		DEBIAN_FRONTEND: string;
		DEPLOY_MODE: string;
		SHELL: string;
		GITHUB_REPOSITORY_ID: string;
		GITHUB_ACTIONS: string;
		PLATFORM_DIR: string;
		NODE_PATH: string;
		npm_package_version: string;
		npm_lifecycle_event: string;
		GITHUB_REF_PROTECTED: string;
		GITHUB_WORKSPACE: string;
		ACCEPT_EULA: string;
		GITHUB_JOB: string;
		GITHUB_SHA: string;
		CLAUDECODE: string;
		GITHUB_RUN_ATTEMPT: string;
		GITHUB_REF: string;
		GITHUB_ACTOR: string;
		ANDROID_SDK_ROOT: string;
		HERMES_URL: string;
		GITHUB_PATH: string;
		JAVA_HOME: string;
		PWD: string;
		GITHUB_ACTOR_ID: string;
		RUNNER_WORKSPACE: string;
		npm_execpath: string;
		HOMEBREW_CLEANUP_PERIODIC_FULL_DAYS: string;
		AI_SYSTEM_PROMPT: string;
		GITHUB_EVENT_NAME: string;
		HOMEBREW_NO_AUTO_UPDATE: string;
		ANDROID_HOME: string;
		GITHUB_SERVER_URL: string;
		GECKOWEBDRIVER: string;
		NVM_CD_FLAGS: string;
		XDG_DATA_DIRS: string;
		GHCUP_INSTALL_BASE_PREFIX: string;
		GITHUB_OUTPUT: string;
		EDGEWEBDRIVER: string;
		npm_command: string;
		PNPM_SCRIPT_SRC_DIR: string;
		ANDROID_NDK: string;
		SGX_AESM_ADDR: string;
		PSModulePath: string;
		CHROME_BIN: string;
		CUBI_CATEGORY: string;
		SELENIUM_JAR_PATH: string;
		MEMORY_PRESSURE_WRITE: string;
		PNPM_HOME: string;
		CLOUDFLARE_DEPLOY_TOKEN: string;
		ANDROID_NDK_HOME: string;
		GITHUB_STEP_SUMMARY: string;
		INIT_CWD: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
