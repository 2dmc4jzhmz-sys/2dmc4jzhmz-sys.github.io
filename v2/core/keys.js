/** 词的稳定索引：与词库分片解耦，重新导出词库也不会丢进度 */
export const wordKey = (w, pos) => `${w}|${pos || ''}`;
