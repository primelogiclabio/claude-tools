// The sampler scripts. A mod has no Node and no native process API, so the
// figures come from the host's own tools, run as one long-lived child of
// Claude Code: its parent is therefore Claude Code's process, the root of the
// tree it reports. Output format: see sample.ts.

export function windowsArgv(intervalSeconds: number): string[] {
  const script = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$ProgressPreference = 'SilentlyContinue'",
    '$self = $PID',
    '$root = (Get-CimInstance Win32_Process -Filter "ProcessId=$self").ParentProcessId',
    '$mem = [int64]((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1024)',
    '"meta $env:NUMBER_OF_PROCESSORS $mem Windows"',
    'while ($true) {',
    '  "begin $self $root $([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"',
    '  foreach ($p in (Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,WorkingSetSize,KernelModeTime,UserModeTime,Name)) {',
    '    "p $($p.ProcessId) $($p.ParentProcessId) $([int64]($p.WorkingSetSize / 1024)) $([int64](($p.KernelModeTime + $p.UserModeTime) / 10000)) $($p.Name)"',
    '  }',
    '  "end"',
    '  [Console]::Out.Flush()',
    `  Start-Sleep -Seconds ${Math.max(1, Math.round(intervalSeconds))}`,
    '}',
  ].join('\n')

  // -EncodedCommand (UTF-16LE, base64) so no quote in the script depends on
  // how the host quotes a native command line.
  return ['powershell.exe', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', utf16Base64(script)]
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** The base64 of `text` as UTF-16LE, what PowerShell's -EncodedCommand reads. */
export function utf16Base64(text: string): string {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    bytes.push(c & 0xff, c >> 8)
  }
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += b === undefined ? '=' : B64[(n >> 6) & 63]!
    out += c === undefined ? '=' : B64[n & 63]!
  }

  return out
}

// Linux reads /proc/<pid>/stat (CPU in clock ticks, memory in pages); macOS
// reads ps, whose `time` column has centiseconds there. `cat` keeps going past
// processes that exit mid-read, which awk alone may not.
const POSIX_SCRIPT = `
iv="$1"
os=$(uname -s)
if [ "$os" = Linux ]; then
  ncpu=$(getconf _NPROCESSORS_ONLN)
  mem=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)
  pg=$(getconf PAGESIZE)
  tck=$(getconf CLK_TCK)
else
  ncpu=$(sysctl -n hw.logicalcpu 2>/dev/null || sysctl -n hw.ncpu)
  mem=$(( $(sysctl -n hw.memsize) / 1024 ))
fi
echo "meta $ncpu $mem $os"
while :; do
  if [ "$os" = Linux ]; then
    read -r up _ < /proc/uptime
    echo "begin $$ $PPID $(echo "$up" | awk '{printf "%d", $1 * 1000}')"
    cat /proc/[0-9]*/stat 2>/dev/null | awk -v pg="$pg" -v tck="$tck" '{
      s = $0; o = index(s, "("); c = 0
      for (i = length(s); i > 0; i--) if (substr(s, i, 1) == ")") { c = i; break }
      if (o == 0 || c == 0) next
      name = substr(s, o + 1, c - o - 1)
      split(substr(s, c + 2), f, " ")
      printf "p %s %s %d %d %s\\n", $1, f[2], f[22] * pg / 1024, (f[12] + f[13]) * 1000 / tck, name
    }'
  else
    echo "begin $$ $PPID"
    ps -A -o pid=,ppid=,rss=,time=,comm= | awk '{ n = $5; for (i = 6; i <= NF; i++) n = n " " $i; print "q", $1, $2, $3, $4, n }'
  fi
  echo end
  sleep "$iv"
done
`

export function posixArgv(intervalSeconds: number): string[] {
  return ['sh', '-c', POSIX_SCRIPT, 'resource-monitor', String(Math.max(1, Math.round(intervalSeconds)))]
}
