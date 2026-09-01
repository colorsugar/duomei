import { pbkdf2Sync, randomBytes } from "node:crypto";

const ITERATIONS = 210_000;

async function hiddenPrompt(label) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("请在交互式终端中运行，避免答案进入命令历史或日志。" );
  }

  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish();
          reject(new Error("已取消。"));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };
    process.stdin.on("data", onData);
  });
}

try {
  const first = (await hiddenPrompt("输入访问答案（不会回显）: ")).normalize("NFKC").trim();
  const second = (await hiddenPrompt("再次输入答案: ")).normalize("NFKC").trim();
  if (!first || first !== second) throw new Error("两次输入不一致。" );
  if (first.length > 64) throw new Error("答案过长。" );

  const salt = randomBytes(16);
  const answerHash = pbkdf2Sync(first, salt, ITERATIONS, 32, "sha256");
  const sessionSecret = randomBytes(32);

  process.stdout.write("\n只复制到 EdgeOne Makers Secret，不要保存到 Git：\n");
  process.stdout.write(`GUYU_ANSWER_SALT=${salt.toString("base64")}\n`);
  process.stdout.write(`GUYU_ANSWER_HASH=${answerHash.toString("base64")}\n`);
  process.stdout.write(`GUYU_SESSION_SECRET=${sessionSecret.toString("base64")}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
