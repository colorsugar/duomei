import { useEffect, useState } from "react";
import { useDuomeiEdit } from "../components/DuomeiEditProvider";
import {
  ABOUT_SETTINGS_UPDATED_EVENT,
  getAboutSettings,
  saveAboutSettings,
} from "../lib/aboutSettings";

export function DuomeiAboutPage() {
  const { editMode, isLoggedIn } = useDuomeiEdit();
  const editable = isLoggedIn && editMode;
  const [settings, setSettings] = useState(() => getAboutSettings());

  useEffect(() => {
    const refresh = () => setSettings(getAboutSettings());
    window.addEventListener(ABOUT_SETTINGS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ABOUT_SETTINGS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const update = (next: typeof settings) => {
    setSettings(next);
    saveAboutSettings(next);
  };

  const updateParagraph = (index: number, value: string) => {
    update({
      ...settings,
      paragraphs: settings.paragraphs.map((paragraph, itemIndex) => (itemIndex === index ? value : paragraph)),
    });
  };

  const addParagraph = () => {
    update({ ...settings, paragraphs: [...settings.paragraphs, "新的文字段落"] });
  };

  const removeParagraph = (index: number) => {
    const paragraphs = settings.paragraphs.filter((_, itemIndex) => itemIndex !== index);
    update({ ...settings, paragraphs: paragraphs.length ? paragraphs : [""] });
  };

  return (
    <main className={`duomei-about${editable ? " about-editing" : ""}`}>
      {editable ? (
        <>
          <input
            className="about-eyebrow-editor"
            value={settings.eyebrow}
            onChange={(event) => update({ ...settings, eyebrow: event.target.value })}
            aria-label="关于页小标题"
          />
          <textarea
            className="about-title-editor"
            value={settings.title}
            onChange={(event) => update({ ...settings, title: event.target.value })}
            aria-label="关于页标题"
          />
          <div className="about-paragraph-editor">
            {settings.paragraphs.map((paragraph, index) => (
              <div className="about-paragraph-row" key={index}>
                <textarea
                  value={paragraph}
                  onChange={(event) => updateParagraph(index, event.target.value)}
                  aria-label={`关于页正文 ${index + 1}`}
                />
                <button type="button" onClick={() => removeParagraph(index)}>
                  删除
                </button>
              </div>
            ))}
            <button type="button" onClick={addParagraph}>
              新增段落
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{settings.eyebrow}</p>
          <h1>{settings.title}</h1>
          <div>
            {settings.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
