/* eslint-disable global-require */
/* eslint-disable prefer-rest-params */
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { formatDate } from '../client'

export function clearMatterContent(content: string) {
  let first___: unknown
  let second___: unknown

  const lines = content.split('\n').reduce<string[]>((pre, line) => {
    // 移除开头的空白行
    if (!line.trim() && pre.length === 0) {
      return pre
    }
    if (line.trim() === '---') {
      if (first___ === undefined) {
        first___ = pre.length
      }
      else if (second___ === undefined) {
        second___ = pre.length
      }
    }
    pre.push(line)
    return pre
  }, [])
  return (
    lines
      // 剔除---之间的内容
      .slice((second___ as number) || 0)
      .join('\n')
  )
}
export function getDefaultTitle(content: string) {
  const title
    = clearMatterContent(content)
      .split('\n')
      ?.find((str) => {
        return str.startsWith('# ')
      })
      ?.slice(2)
      .replace(/^\s+|\s+$/g, '') || ''
  return title
}

export function getFileBirthTime(url: string) {
  let date = new Date()

  try {
    // 参考 vitepress 中的 getGitTimestamp 实现
    const infoStr = spawnSync('git', ['log', '-1', '--pretty="%ci"', url])
      .stdout?.toString()
      .replace(/["']/g, '')
      .trim()
    if (infoStr) {
      date = new Date(infoStr)
    }
  }
  catch (error) {
    return formatDate(date)
  }

  return formatDate(date)
}

export function getGitTimestamp(file: string) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['log', '-1', '--pretty="%ci"', file])
    let output = ''
    child.stdout.on('data', (d) => {
      output += String(d)
    })
    child.on('close', () => {
      resolve(+new Date(output))
    })
    child.on('error', reject)
  })
}

export function getTextSummary(text: string, count = 100) {
  return (
    clearMatterContent(text)
      .match(/^# ([\s\S]+)/m)?.[1]
      // 除去标题
      ?.replace(/#/g, '')
      // 除去图片
      ?.replace(/!\[.*?\]\(.*?\)/g, '')
      // 除去链接
      ?.replace(/\[(.*?)\]\(.*?\)/g, '$1')
      // 除去加粗
      ?.replace(/\*\*(.*?)\*\*/g, '$1')
      ?.split('\n')
      ?.filter(v => !!v)
      ?.slice(1)
      ?.join('\n')
      ?.replace(/>(.*)/, '')
      ?.slice(0, count)
  )
}

export function aliasObjectToArray(obj: Record<string, string>) {
  return Object.entries(obj).map(([find, replacement]) => ({
    find,
    replacement
  }))
}

export const EXTERNAL_URL_RE = /^[a-z]+:/i

/**
 * Join two paths by resolving the slash collision.
 */
export function joinPath(base: string, path: string): string {
  return `${base}${path}`.replace(/\/+/g, '/')
}

export function withBase(base: string, path: string) {
  return EXTERNAL_URL_RE.test(path) || path.startsWith('.')
    ? path
    : joinPath(base, path)
}

function isBase64ImageURL(url: string) {
  // Base64 图片链接的格式为 data:image/[image format];base64,[Base64 编码的数据]
  const regex = /^data:image\/[a-z]+;base64,/
  return regex.test(url)
}

/**
 * 从文档内容中提取封面
 * @param content 文档内容
 */
export function getFirstImagURLFromMD(content: string, route: string) {
  const url = content.match(/!\[.*\]\((.*)\)/)?.[1]?.replace(/['"]/g, '')
  const isHTTPSource = url && url.startsWith('http')
  if (!url) {
    return ''
  }

  if (isHTTPSource || isBase64ImageURL(url)) {
    return url
  }

  // TODO: 其它协议，待补充

  const paths = joinPath('/', route).split('/')
  paths.splice(paths.length - 1, 1)
  const relativePath = url.startsWith('/') ? url : path.join(paths.join('/') || '', url)

  return joinPath('/', relativePath)
}
