import type { ReactNode } from "react";

/** 内置头像：id + 名称 + 底色 + 白色图形 */
export interface AvatarPreset {
  id: string;
  label: string;
  color: string;
  glyph: ReactNode;
}

/** 默认头像（未选择时使用） */
export const DEFAULT_AVATAR_ID = "person";

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "person",
    label: "学习者",
    color: "#0969da",
    glyph: (
      <>
        <circle cx="12" cy="8" r="3.6" fill="#fff" />
        <path d="M4.5 20c0-3.8 3.4-6 7.5-6s7.5 2.2 7.5 6z" fill="#fff" />
      </>
    ),
  },
  {
    id: "cat",
    label: "猫",
    color: "#e8590c",
    glyph: (
      <>
        <path d="M5 9 4 3l5 3h6l5-3-1 6" fill="#fff" />
        <circle cx="12" cy="13" r="6" fill="#fff" />
        <circle cx="9.5" cy="12.5" r="1" fill="#e8590c" />
        <circle cx="14.5" cy="12.5" r="1" fill="#e8590c" />
        <path d="M11 15.5h2l-1 1.5z" fill="#e8590c" />
      </>
    ),
  },
  {
    id: "bird",
    label: "小鸟",
    color: "#1a7f37",
    glyph: (
      <>
        <circle cx="11" cy="11" r="6" fill="#fff" />
        <path d="M17 11l4 2-4 2z" fill="#fff" />
        <circle cx="12.5" cy="9.5" r="0.9" fill="#1a7f37" />
        <path d="M4 8c-2 3 0 5 3 5" stroke="#fff" strokeWidth="1.4" fill="none" />
      </>
    ),
  },
  {
    id: "bear",
    label: "小熊",
    color: "#8250df",
    glyph: (
      <>
        <circle cx="6.5" cy="6.5" r="2.6" fill="#fff" />
        <circle cx="17.5" cy="6.5" r="2.6" fill="#fff" />
        <circle cx="12" cy="12.5" r="6.5" fill="#fff" />
        <circle cx="9.7" cy="11.5" r="1" fill="#8250df" />
        <circle cx="14.3" cy="11.5" r="1" fill="#8250df" />
        <ellipse cx="12" cy="15.5" rx="2.2" ry="1.6" fill="#8250df" />
      </>
    ),
  },
  {
    id: "rabbit",
    label: "兔子",
    color: "#bf3989",
    glyph: (
      <>
        <ellipse cx="9" cy="5.5" rx="1.8" ry="4.2" fill="#fff" />
        <ellipse cx="15" cy="5.5" rx="1.8" ry="4.2" fill="#fff" />
        <circle cx="12" cy="14" r="6" fill="#fff" />
        <circle cx="9.8" cy="13" r="1" fill="#bf3989" />
        <circle cx="14.2" cy="13" r="1" fill="#bf3989" />
        <circle cx="12" cy="16.2" r="1.1" fill="#bf3989" />
      </>
    ),
  },
  {
    id: "robot",
    label: "机器人",
    color: "#57606a",
    glyph: (
      <>
        <circle cx="12" cy="2.8" r="1.3" fill="#fff" />
        <rect x="5" y="5" width="14" height="13" rx="3" fill="#fff" />
        <circle cx="9.2" cy="10.5" r="1.4" fill="#57606a" />
        <circle cx="14.8" cy="10.5" r="1.4" fill="#57606a" />
        <rect x="9" y="14" width="6" height="1.6" rx="0.8" fill="#57606a" />
      </>
    ),
  },
  {
    id: "star",
    label: "星星",
    color: "#bf8700",
    glyph: (
      <path
        d="M12 3l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.3l6-.8z"
        fill="#fff"
      />
    ),
  },
  {
    id: "flower",
    label: "花",
    color: "#cf222e",
    glyph: (
      <>
        <circle cx="12" cy="7" r="2.6" fill="#fff" />
        <circle cx="7" cy="11" r="2.6" fill="#fff" />
        <circle cx="17" cy="11" r="2.6" fill="#fff" />
        <circle cx="9.2" cy="16.5" r="2.6" fill="#fff" />
        <circle cx="14.8" cy="16.5" r="2.6" fill="#fff" />
        <circle cx="12" cy="12" r="2.4" fill="#cf222e" />
      </>
    ),
  },
];

function findPreset(id?: string): AvatarPreset {
  return (
    AVATAR_PRESETS.find((p) => p.id === id) ??
    AVATAR_PRESETS.find((p) => p.id === DEFAULT_AVATAR_ID)!
  );
}

/** 头像渲染：上传图片优先，否则按预设 ID 渲染 SVG，未设置时用默认头像 */
export function Avatar({ avatar, size = 44 }: { avatar?: string; size?: number }) {
  const box = {
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
  } as const;

  if (avatar && avatar.startsWith("data:image/")) {
    return <img src={avatar} alt="头像" style={{ ...box, objectFit: "cover" }} />;
  }

  const preset = findPreset(avatar);
  return (
    <span
      aria-hidden
      style={{ ...box, backgroundColor: preset.color, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24">
        {preset.glyph}
      </svg>
    </span>
  );
}

/**
 * 读取用户选择的图片并压缩为 128×128 的 JPEG data URL（居中裁剪）。
 * 压缩后通常 5–15KB，可安全存入 localStorage。
 */
export function readImageAsAvatar(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("请选择图片文件"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("图片解析失败，请换一张试试"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("当前浏览器不支持图片处理"));
          return;
        }
        // 白底，避免透明 PNG 转 JPEG 后变黑
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, size, size);
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
