import fs from 'fs'
import path from 'path'

export type AssertionResult = {
  name: string
  suite: string
  success: boolean
  error?: string
  scenario: 'Best Case' | 'Worst Case' | 'Possible Scenario' | 'Impossible Scenario'
}

export class ReportManager {
  results: AssertionResult[] = []
  currentSuite = ''

  setSuite(name: string) {
    this.currentSuite = name
  }

  assert(
    name: string,
    condition: boolean,
    scenario: AssertionResult['scenario'],
    messageOnFail?: string
  ) {
    this.results.push({
      name,
      suite: this.currentSuite,
      success: condition,
      error: condition ? undefined : (messageOnFail || 'Assertion failed'),
      scenario,
    })
    if (condition) {
      console.log(`  ✓ PASS [${scenario}]: ${name}`)
    } else {
      console.error(`  ✗ FAIL [${scenario}]: ${name} - ${messageOnFail || 'Assertion failed'}`)
    }
  }

  generateMarkdownReport(outputPath: string): string {
    const total = this.results.length
    const passed = this.results.filter((r) => r.success).length
    const failed = total - passed

    let md = `# ZiniKart API Integration Test Report\n\n`
    md += `**Execution Time:** ${new Date().toLocaleString()}\n`
    md += `**Total Assertions:** ${total} | **Passed:** ${passed} | **Failed:** ${failed}\n\n`

    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0
    md += `### Pass Rate: ${percentage}%\n`

    // Progress bar representation
    const greenBlocks = Math.round(percentage / 10)
    const grayBlocks = 10 - greenBlocks
    md += `\`[${'█'.repeat(greenBlocks)}${'.'.repeat(grayBlocks)}]\`\n\n`

    md += `## Summary Table\n\n`
    md += `| Suite | Scenario | Test Case / Assertion | Status | Error Details |\n`
    md += `| --- | --- | --- | --- | --- |\n`

    for (const r of this.results) {
      const statusIcon = r.success ? '✅ PASS' : '❌ FAIL'
      const err = r.error ? `\`${r.error.replace(/\|/g, '\\|')}\`` : '-'
      md += `| ${r.suite} | ${r.scenario} | ${r.name} | ${statusIcon} | ${err} |\n`
    }

    try {
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(outputPath, md, 'utf-8')
      console.log(`\nMarkdown report successfully generated at: ${outputPath}`)
    } catch (err) {
      console.error('Failed to write markdown report file:', err)
    }

    return md
  }
}

export async function apiRequest(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: any,
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  try {
    const res = await fetch(`http://localhost:3000${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    let responseBody: any = null
    try {
      responseBody = await res.json()
    } catch (e) {
      // Not JSON
    }
    return {
      status: res.status,
      headers: res.headers,
      body: responseBody,
    }
  } catch (error) {
    return {
      status: 500,
      headers: new Headers(),
      body: { error: error instanceof Error ? error.message : 'Fetch error', success: false },
    }
  }
}
