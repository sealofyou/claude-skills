# 本机模型配套 CLI

先以本机 `--version` 和 `--help` 确认参数。下面是已核实版本的起点，不承诺未来版本或其他机器已经配置。复用本机既有 provider，不复制 Key，不临时登录另一个账号。

## Grok Build

本机验证版本：1.0.13。模型名是本机 Grok 的模型条目，条目内的上游 model 也必须与用户要求相符。

```text
grok --prompt-file <UTF-8任务包> --cwd <绝对目录> -m grok-4.6 --output-format streaming-json --max-turns 6 --permission-mode dontAsk --tools read_file
```

这个示例只允许读取文件。需要其他工具时先从当前帮助/文档确认名称，并只开放已授权范围。不要使用 `--yolo` 或 `bypassPermissions`。`--cwd` 不是 OS 级安全边界，Windows 不能把应用层工具规则当成系统沙箱。写任务沿用父任务已批准的隔离环境及权限。

为单任务子进程关闭无关扫描与递归时，可仅在该子进程设置 `GROK_CURSOR_MCPS_ENABLED=false`、`GROK_CLAUDE_MCPS_ENABLED=false`、`GROK_MEMORY=0`、`GROK_SUBAGENTS=0`、`GROK_WORKFLOWS=0`；这些是版本相关设置，应按当前支持情况使用。

长提示词用 `--prompt-file`，stdin 不保证进入 Grok 提示词。保存 stdout / stderr，检查真实工具事件、stopReason 和最终正文；不能仅凭退出码 0 认定完成。

## Gemini CLI

本机验证版本：0.58.0。CPA 接入通常使用 Gemini 原生协议（如 `/v1beta`）；不要把 Codex 的 `/v1/responses` 配置直接写进 Gemini。

```text
gemini -m <真实模型ID> -p "完成标准输入中的任务；保持只读。" --approval-mode plan --output-format json
```

将任务包通过子进程 stdin 传入，或在 shell 中使用安全的文件管道；不要拼接长提示词到 shell 命令。执行目录由父进程的 cwd 指定。`plan` 是应用层只读模式，仍须遵守父任务的系统权限。需要编辑时使用当前版本支持的正常权限流程，不用 yolo。

不要直接传 `gemini3.8flash`：从本机 provider 的模型列表确认完整 ID。目录有 `gemini-3.8-flash-high` 时告知这个完整名称，不能声称已经验证不带后缀的 ID。

## Kimi Code

本机历史已验证 `kimi-k3`，本机配置条目示例是 `cpa/kimi-k3`；跨机器和升级后重新用本机帮助核实。

```text
kimi --help
kimi provider list
kimi -m cpa/kimi-k3 --plan -p "<短任务>" --output-format stream-json
```

0.26.0 的 `-m` 选择本机模型条目、`--plan` 启用应用层计划模式。确认条目对应的上游模型后再用 `-p` 发短任务，不改全局默认。长中文任务使用该版本已支持的文件/stdin 方式；不可把 Gemini 或 Grok 的参数照搬给 Kimi。

Kimi 旧版 `--prompt` 与 `--auto` / `--yolo` 不兼容，且工具权限等待可能导致无头超时。区分权限等待和模型失败，不用自动放权解决。确认精确 session 后才能续接，禁止并发时使用模糊的 `--continue`。
