# eryu-skills

尔玉跨机器 Skill 入口。仓库只直接维护个人编排 Skill；第三方 Skill 通过来源清单安装，不再复制完整上游仓库。

## 安装

### Windows

```powershell
git clone https://github.com/sealofyou/eryu-skills.git "$HOME\workspace\github\eryu-skills"
cd "$HOME\workspace\github\eryu-skills"
.\install.ps1 -Profile core
```

### macOS / Linux

```bash
git clone https://github.com/sealofyou/eryu-skills.git ~/workspace/github/eryu-skills
cd ~/workspace/github/eryu-skills
bash install.sh core
```

重启 Codex 或 Agent session 后加载新 Skill。

## Profile

| Profile | 内容 |
| --- | --- |
| `core` | 尔玉分享工坊、尔玉短视频工坊、动态网页路由、滴答飞书轻量巡检、任务状态回写、Codex 指定模型子 Agent 路由、GitHub 知识库、Frontend Slides |
| `content` | 写作、思维挖掘、配图、课程、视频笔记和批量生图 |
| `slides` | gpt-image2-ppt 与 Guizang 专项路线 |
| `design` | UI/UX Pro Max |
| `tools` | Harness、ModelScope 等工程工具 |
| `media` | 剪映自动化 Skill |
| `all` | 安装以上全部 profile |

选择非 `core` profile 时会自动同时安装 core。

## 源码边界

- `skills/`：由尔玉维护、可以直接跨机器同步的轻量 Skill。
- `skills.sources.csv`：第三方或独立仓库的来源、分支和子目录。
- `install.ps1` / `install.sh`：把选定 profile 安装到 `~/.codex/skills`。
- `~/.cache/eryu-skills/repos`：外部仓库缓存，不进入 Git。
- 清单的 `platform` 列用于跳过不适用当前系统的 Skill；省略或填写 `all` 表示跨平台。

OMX、Codex 系统 Skill、飞书/Lark 插件、浏览器插件和带本机授权的连接器由各自安装器管理，不复制进本仓库。

## 运行时兼容性

强模型可以替代一部分“通用提示词脚手架”，但不能替代工具调用边界、私有工作流规则和第三方 API 参考。因而本仓库遵循三条原则：

- 只把个人领域 Skill 和可验证的工具型 Skill 作为跨机器来源；不镜像系统、插件或连接器 Skill。
- 不纳入要求调用其他平台不存在的 Skill 工具、覆盖系统指令或强制无条件 TDD / worktree / 计划确认的流程 Skill。
- `core` 保持轻量；写作、幻灯片、设计、工具和媒体能力继续按 profile 按需安装。

`eryu-task-writeback` 固定飞书 Base 同一任务行的开始、阶段、等待、暂停、待验收和完成回写。跨机器补漏仍要求每台机器运行自己的本机 Heartbeat；SSH 可用于安装与核验，不能代替远端 Codex task 状态证据。

最近一次本地运行时审计与裁剪记录见 [`docs/skill-audit-2026-07-27.md`](docs/skill-audit-2026-07-27.md)。

## 更新

```bash
git pull --ff-only
```

然后重新运行对应安装命令。安装器只替换清单中由本仓库管理的目标目录，不删除其他 Skill。

## 安全

不要提交 API key、token、密码、OAuth 文件、cookie、私钥、`.env`、数据库、日志、浏览器状态和生成产物。个人 Skill 只保存读取私有上下文的规则，不保存私有正文和凭据。

审计记录见 `docs/skill-audit-2026-07-15.md` 和 `docs/skill-audit-2026-07-27.md`。


`eryu-codex-subagent-router` 原名 `model-subagent-router`，现明确面向 Codex 主控。已有旧版的机器升级时，确认没有本机自改后移除旧名称的安装目录，避免重复发现；不把本机重命名当成其他机器已迁移。
