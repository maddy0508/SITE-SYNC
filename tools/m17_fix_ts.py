from pathlib import Path
p=Path('sitesync/src/attendance/M17RealRuntimeQaScreenV2.tsx')
s=p.read_text()
s=s.replace("await new Promise(resolve => setTimeout(resolve, 750));", "await new Promise<void>(resolve => setTimeout(resolve, 750));")
p.write_text(s)
