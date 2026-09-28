import { Fragment, type ReactNode } from 'react';
import { BLANK, tokenize } from '../lib/ruby';

/** 把「食[た]べる」「**重點**」「（　）」轉成 React 元素 */
export function renderRich(text: string, fill?: ReactNode): ReactNode[] {
  const nodes: ReactNode[] = [];
  text.split('**').forEach((part, pi) => {
    const inner: ReactNode[] = [];
    part.split(BLANK).forEach((seg, si) => {
      if (si > 0) {
        inner.push(
          <span key={`b${pi}-${si}`} className="blank" aria-label={fill ? undefined : '空格'}>
            {fill ?? '　'}
          </span>,
        );
      }
      tokenize(seg).forEach((t, ti) => {
        const key = `t${pi}-${si}-${ti}`;
        inner.push(t.rt ? <ruby key={key}>{t.base}<rt>{t.rt}</rt></ruby> : <Fragment key={key}>{t.base}</Fragment>);
      });
    });
    if (pi % 2 === 1) nodes.push(<mark key={`m${pi}`}>{inner}</mark>);
    else nodes.push(...inner);
  });
  return nodes;
}

type Tag = 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3';

interface JpProps {
  text: string;
  /** 填進（　）的內容（例如作答後顯示答案） */
  fill?: ReactNode;
  /** 內容是日文（預設）還是中文夾雜日文 */
  ja?: boolean;
  as?: Tag;
  className?: string;
}

export function Jp({ text, fill, ja = true, as: El = 'span', className }: JpProps) {
  return (
    <El className={className} lang={ja ? 'ja' : undefined}>
      {renderRich(text, fill)}
    </El>
  );
}
