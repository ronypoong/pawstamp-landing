import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import App from "./App";

/** 빌드 시 정적 HTML 미리 그리기(검색엔진용). 클라이언트는 main.tsx 가 그대로 다시 그린다. */
export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );
}
