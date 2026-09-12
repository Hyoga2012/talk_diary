import type { ClassifiedItem, EntryCategory } from "./types";

/** 행동/약속 의도가 보이면 할일로도 올리는 표현 */
const ACTION_PATTERNS = [
  /할\s*(?:거|꺼)(?:야|예요|에요|다)?/,
  /할\s*래/,
  /해야\s*(?:해|돼|겠|지|한다)/,
  /해야지/,
  /하자/,
  /하겠습니다/,
  /까지\s*(?:할|끝내|완성|제출|보내)/,
  /참석/,
  /시험/,
  /미팅|회의|약속/,
  /보내\s*(?:야|자|기)/,
  /준비하/,
  /만나/,
  /만들(?:거|꺼|게|자|어야)/,
  /가\s*(?:야|자|기로)/,
  /오\s*(?:야|자)/,
];

const PURE_THOUGHT_PATTERNS = [
  /생각(?:이)?\s*(?:났|들)/,
  /느낌/,
  /기분이/,
  /회고/,
  /돌아보니/,
];

export function enrichTodos(items: ClassifiedItem[]): ClassifiedItem[] {
  return items.map((item) => {
    const blob = `${item.title}\n${item.content}`;
    const shouldTodo = shouldCreateTodo(item.category, blob, item.is_todo);

    if (!shouldTodo) {
      return {
        ...item,
        is_todo: false,
        todo_title: null,
      };
    }

    return {
      ...item,
      is_todo: true,
      todo_title: (item.todo_title || item.title || "할일").trim(),
      due_date: item.due_date || item.entry_date || null,
    };
  });
}

function shouldCreateTodo(
  category: EntryCategory,
  blob: string,
  already?: boolean,
): boolean {
  if (already) return true;
  if (category === "todo" || category === "schedule") return true;

  const hasAction = ACTION_PATTERNS.some((re) => re.test(blob));
  if (!hasAction) return false;

  // 생각/아이디어라도 "할거야/까지 할거야"가 있으면 할일
  if (category === "idea" || category === "thought" || category === "note") {
    // 순수 감상만 있고 행동이 약하면 제외하지 않음 — 행동 패턴이 있으면 포함
    if (
      PURE_THOUGHT_PATTERNS.some((re) => re.test(blob)) &&
      !hasAction
    ) {
      return false;
    }
    return true;
  }

  return false;
}
