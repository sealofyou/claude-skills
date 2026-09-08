---
name: model-subagent-router
description: 当用户要求使用子 Agent、子任务委派、指定 Grok/Gemini/Kimi 等模型协作，或明确指定 Grok Build、Gemini CLI、Kimi Code 时使用。明确指令优先；否则先用当前软件原生子 Agent，再核实同软件 CLI，最后才用模型配套的本机 Agent。普通模型问答不触发执行。
---

# 指定模型子 Agent 路由

把用户交给子 Agent 的任务交到正确的模型和执行器，并把结果带回当前会话。保持主 Agent 的模型、思考强度和全局配置不变。

## 按用户指定程度选择

1. **明确执行器**：例如“用 Grok Build 的 grok-4.6”“直接用 Gemini CLI”“用 Kimi Code 的 kimi-k3”，直接使用指定执行器和模型；不先换成 Codex，也不重复询问。
2. **只指定模型**：先检查本轮当前软件的原生子 Agent 工具及可用模型；精确模型可用就直接派发。若工具没有这个模型或已经有兼容失败证据，再检查同软件 CLI 的自定义 provider；在 Codex 中按下节调用 Codex CLI。仍不兼容时才使用该模型配套的本机 Agent。
3. **只说使用子 Agent，未指定模型或执行器**：优先当前软件原生子 Agent，继承当前模型及思考强度；不擅自指定更便宜的模型。若原生委派不可用，先检查同软件 CLI，再考虑当前模型配套的本机 Agent。不存在明确配套关系时说明缺口，不随机换品牌。
4. **明确约束原生或拒绝回退**：只用指定路径；不可用时报告边界，不能把 CLI 子进程或直接 API 请求冒充原生子 Agent。

“明确按我的选择做”优先于默认顺序。用户的模型要求和执行器要求同时有效：执行器不支持该模型时说明具体冲突，不自行更换任何一个。

## 先确认真实模型和能力

- 原生工具以当前会话工具描述和模型列表为准，不向有限列表塞入任意模型名。Skill 不能新增模型权限或扩展工具 schema。工具允许改模型但要求不继承完整历史时，传自包含任务包；不要直接传全部会话。
- 同软件 CLI 是本机子进程，**不是 App 内置子 Agent 卡片**，没有 App 协作工具的 agent id；必须如实标注。
- CPA 目录只证明模型已登记。首次使用某个“执行器＋模型＋协议”组合时做小型工具任务；检查真实文件读取、最终输出和必要的 diff / 测试。只会回答“OK”不足以证明它能执行任务。
- 模型简称只做不改变含义的大小写、空格和标点规范化，例如 `grok4.6` → `grok-4.6`。保留版本、`flash`、`high`、`256k` 等后缀。简称缺少后缀且目录只有一个合理候选时，先告知完整 ID；多个候选则向用户消歧。用户要求精确 ID 时不可替换。
- 一个有依据的短暂重试后仍失败，记录原因并按已授权顺序回退。认证错误、超时或单任务失败不等于“该软件永远不支持这个模型”。不要自动安装、升级、改凭据或关闭沙箱来解决可用性问题。

## Codex 同软件 CLI 路径

需要 Node.js 22+ 和支持 `exec --ignore-user-config --ephemeral --json` 的本机 Codex CLI。先检查 `codex exec --help`；不支持时不能直接套命令。

辅助脚本读取当前 `CODEX_HOME/config.toml` 的当前 Responses provider，复用其 `experimental_bearer_token` 或 `env_key`；只有 provider 明确声明 `requires_openai_auth=true` 时才回退到该 Codex 认证文件的 API key。也可由既有本机配置注入成对的 `CPA_BASE_URL / CPA_API_KEY`。它不修改全局配置、不复制认证文件，也不加载用户配置里配置的 MCP / 插件；Codex 自身仍可能加载运行时 Skill 和插件目录。项目与用户规则仍需遵守并在任务包中传递必要约束。

```text
node <skill-dir>/scripts/codex-cpa.mjs models
node <skill-dir>/scripts/codex-cpa.mjs run --model <真实ID> --cwd <绝对目录> --prompt-file <UTF-8任务包> --out-dir <本次独立输出目录> --timeout 180
```

- 默认 `--access read-only`；已授权实现任务可传 `--access workspace-write`，只在任务范围内使用，不能超出父任务权限。
- 只有用户或当前任务明确给了思考强度才传 `--effort`；不偷偷降低强度，不把某个模型的后缀当成另一个模型。
- 默认使用短暂、不持久化的 CLI 会话。每次调用给新的输出目录，防止覆盖旧证据。
- `read-only` 主要限制写入，`--cwd` 不限制全部可读范围。只需少量材料时用只含必要材料的临时工作目录；需要强读取隔离时使用已有受控沙箱，不能把工作目录当成隔离保证。
- 包装器过滤无关环境变量，命令工具不继承 API 认证环境；仍保留宿主 HOME / APPDATA / CODEX_HOME 等运行路径。**它没有实现凭据文件的读取隔离**，同一用户权限下的子进程可能访问这些文件。只用于父任务已经授权的宿主执行场景；需要隔离凭据或限定读取范围时使用已有 OS 级受控环境，不能只换 HOME 或临时目录来宣称安全隔离。
- 超时会终止子进程树；若终止仍失败，`terminationFailed=true` 并给出 PID。此时报告残留进程，不把它当成结束，不启动重复任务。
- Windows 上宿主配置/钥匙串在普通沙箱内不可读时，按当前平台审批机制申请这个具体调用；子 Codex 仍保留只读或工作区沙箱。审批拒绝时不能改用配套 CLI 绕过同一个限制。
- `result.json` 中的 `model` 是实际发出的请求 ID，不是已核实的上游厂商身份。CPA 可能有服务端映射，不能根据模型自述确认真实身份。
- `processCompleted=true` 仅表示 CLI 正常结束；主 Agent 还必须检查 `finalText`、`toolCalls` 和实际验收证据。`acceptanceVerified` 默认始终为 false，由主 Agent 独立判断任务是否完成。

## 模型配套 Agent 回退

仅当用户明确点名，或上述同软件路径已确认不可用时读取 [配套 CLI 用法](references/companion-clis.md)。Grok 用 Grok Build，Gemini 用 Gemini CLI，Kimi 用 Kimi Code；以本机实际安装和已配置模型为准。不要因为 Gemini CLI 的菜单能列 Grok，就默认拿 Gemini CLI 跑 Grok。

## 委派与收回结果

任务包写清：目标、必要材料、绝对工作目录、允许修改的范围、交付物、验收条件、网络需要与时间上限。并行任务要独立，避免多个 Agent 写同一文件；不要主动把整个私有仓库、凭据、无关聊天和个人资料放进模型任务包。这个信息最小化要求不等于包装器提供了强读取隔离。

启动时用一句话说明实际执行器和完整模型 ID。收回后核对退出码、错误、是否超时、实际文件变化与验收结果，再汇总给用户。日志、原始任务材料和会话只保留在本机临时或 ignored 目录；不进入公开 Skill 源码。
