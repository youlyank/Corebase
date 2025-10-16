"use client"

import { useState, useEffect, useRef } from "react"
import { Code, Loader2, Check, X, Terminal, Zap, Lightbulb, Users, Plus, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EditorCollab } from "@/components/EditorCollab"
import AgenticDeveloper from "@/components/AgenticDeveloper"

interface CompletionItem {
  label: string;
  kind: 'function' | 'variable' | 'class' | 'method' | 'property' | 'keyword' | 'snippet';
  detail?: string;
  documentation?: string;
  insertText: string;
  priority: number;
  source: 'ai' | 'local' | 'cache';
}

interface CompletionResult {
  items: CompletionItem[];
  processingTime: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("ai-completion")
  const [code, setCode] = useState("// Welcome to AI Code Completion Demo\n// Start typing to see AI-powered suggestions\n\nfunction hello() {\n  console.log('Hello, World!');\n}")
  const [language, setLanguage] = useState("javascript")
  const [completions, setCompletions] = useState<CompletionItem[]>([])
  const [selectedCompletion, setSelectedCompletion] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showCompletions, setShowCompletions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ line: 0, column: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Collaboration state
  const [roomId, setRoomId] = useState("")
  const [userId, setUserId] = useState("")
  const [userName, setUserName] = useState("")
  const [collabContent, setCollabContent] = useState("// Collaborative Editor Demo\n// Start typing and share this room with others!\n\nfunction collaborate() {\n  console.log('Working together!');\n}")

  // Initialize collaboration user info
  useEffect(() => {
    setUserId(`user_${Math.random().toString(36).substr(2, 9)}`)
    setUserName(`User ${Math.floor(Math.random() * 1000)}`)
    setRoomId(`room_${Math.random().toString(36).substr(2, 6)}`)
  }, [])

  const handleCodeChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    setCode(newCode)
    
    // Get cursor position
    const textarea = e.target
    const cursorPos = textarea.selectionStart
    const lines = newCode.substring(0, cursorPos).split('\n')
    const currentLine = lines.length - 1
    const currentColumn = lines[lines.length - 1].length
    
    setCursorPosition({ line: currentLine, column: currentColumn })
    
    // Get completions if there's meaningful content
    const currentLineText = lines[currentLine]
    if (currentLineText.trim().length > 0) {
      await getCompletions(newCode, currentLine, currentColumn)
    } else {
      setCompletions([])
      setShowCompletions(false)
    }
  }

  const getCompletions = async (code: string, line: number, column: number) => {
    setIsLoading(true)
    setShowCompletions(false)
    
    try {
      const response = await fetch('/api/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: `demo.${language}`,
          language,
          position: { line, column },
          prefix: code.substring(0, code.length),
          suffix: "",
          entireContent: code
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to get completions')
      }
      
      const result: CompletionResult = await response.json()
      
      setCompletions(result.items.slice(0, 8)) // Limit to 8 suggestions
      setSelectedCompletion(0)
      if (result.items.length > 0) {
        setShowCompletions(true)
      }
    } catch (error) {
      console.error('Failed to get completions:', error)
      // Fallback to local completions
      const fallbackCompletions = getLocalCompletions(code, line, column)
      setCompletions(fallbackCompletions.slice(0, 8))
      setSelectedCompletion(0)
      if (fallbackCompletions.length > 0) {
        setShowCompletions(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getLocalCompletions = (code: string, line: number, column: number): CompletionItem[] => {
    const completions: CompletionItem[] = []
    const lines = code.split('\n')
    const currentLine = lines[line] || ''
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        completions.push(...getJavaScriptCompletions(currentLine))
        break
      case 'python':
        completions.push(...getPythonCompletions(currentLine))
        break
    }
    
    return completions
  }

  const getJavaScriptCompletions = (prefix: string): CompletionItem[] => {
    const patterns = [
      { label: 'console.log()', insertText: 'console.log()', kind: 'method' as const },
      { label: 'const ', insertText: 'const ', kind: 'keyword' as const },
      { label: 'let ', insertText: 'let ', kind: 'keyword' as const },
      { label: 'function ', insertText: 'function ', kind: 'keyword' as const },
      { label: 'async function ', insertText: 'async function ', kind: 'keyword' as const },
      { label: 'await ', insertText: 'await ', kind: 'keyword' as const },
      { label: 'return ', insertText: 'return ', kind: 'keyword' as const },
      { label: 'if ()', insertText: 'if ()', kind: 'snippet' as const },
      { label: 'for ()', insertText: 'for ()', kind: 'snippet' as const }
    ]

    return patterns.map(pattern => ({
      ...pattern,
      priority: 70,
      source: 'local' as const
    }))
  }

  const getPythonCompletions = (prefix: string): CompletionItem[] => {
    const patterns = [
      { label: 'def ', insertText: 'def ', kind: 'keyword' as const },
      { label: 'class ', insertText: 'class ', kind: 'keyword' as const },
      { label: 'import ', insertText: 'import ', kind: 'keyword' as const },
      { label: 'print()', insertText: 'print()', kind: 'function' as const },
      { label: 'self', insertText: 'self', kind: 'variable' as const }
    ]

    return patterns.map(pattern => ({
      ...pattern,
      priority: 70,
      source: 'local' as const
    }))
  }

  const applyCompletion = (completion: CompletionItem) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const cursorPos = textarea.selectionStart
    const lines = code.substring(0, cursorPos).split('\n')
    const currentLineStart = code.lastIndexOf('\n', cursorPos - 1) + 1
    
    // Replace current line content up to cursor with completion
    const beforeCursor = code.substring(0, currentLineStart)
    const afterCursor = code.substring(cursorPos)
    const newCode = beforeCursor + completion.insertText + afterCursor
    
    setCode(newCode)
    setShowCompletions(false)
    
    // Set cursor position after completion
    setTimeout(() => {
      const newCursorPos = currentLineStart + completion.insertText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showCompletions || completions.length === 0) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedCompletion(prev => (prev + 1) % completions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedCompletion(prev => prev === 0 ? completions.length - 1 : prev - 1)
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        applyCompletion(completions[selectedCompletion])
        break
      case 'Escape':
        setShowCompletions(false)
        break
    }
  }

  const generateNewRoom = () => {
    setRoomId(`room_${Math.random().toString(36).substr(2, 6)}`)
    setCollabContent("// Collaborative Editor Demo\n// Start typing and share this room with others!\n\nfunction collaborate() {\n  console.log('Working together!');\n}")
  }

  const examples = {
    javascript: `// JavaScript Example
function calculateSum(numbers) {
  // Start typing here...
  
}`,
    python: `# Python Example
def calculate_average(numbers):
    # Start typing here...
    
`,
    typescript: `// TypeScript Example
interface User {
  name: string;
  age: number;
}

function processUser(user: User) {
  // Start typing here...
  
}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">AI-Powered Development Suite</h1>
          </div>
          <p className="text-lg text-gray-600 mb-2">
            Experience intelligent code completion and real-time collaboration
          </p>
          <p className="text-sm text-gray-500">
            Powered by AI + Yjs CRDT + Socket.IO
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai-completion" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              AI Completion
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Real-time Collab
            </TabsTrigger>
            <TabsTrigger value="agentic" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Agent
            </TabsTrigger>
          </TabsList>

          {/* AI Completion Tab */}
          <TabsContent value="ai-completion" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Code Editor */}
              <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-blue-600" />
                    <CardTitle>Code Editor</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Line {cursorPosition.line + 1}, Col {cursorPosition.column + 1}
                    </Badge>
                    {isLoading && (
                      <Badge variant="secondary" className="text-xs">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        AI Thinking...
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Write your code and get intelligent AI-powered completions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={handleCodeChange}
                    onKeyDown={handleKeyDown}
                    className="w-full h-96 p-4 font-mono text-sm bg-slate-900 text-slate-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Start typing to see AI completions..."
                    spellCheck={false}
                  />
                  
                  {/* Completions Popup */}
                  {showCompletions && completions.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                      {completions.map((completion, index) => (
                        <div
                          key={index}
                          className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                            index === selectedCompletion 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => applyCompletion(completion)}
                        >
                          <div className="flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            <span className="font-mono text-sm">{completion.label}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant={completion.source === 'ai' ? 'default' : 'secondary'} 
                              className="text-xs"
                            >
                              {completion.source}
                            </Badge>
                            {index === selectedCompletion && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Instructions */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Keyboard Shortcuts:</p>
                      <ul className="text-xs space-y-1">
                        <li>• <kbd>↑</kbd> / <kbd>↓</kbd> - Navigate suggestions</li>
                        <li>• <kbd>Enter</kbd> / <kbd>Tab</kbd> - Accept suggestion</li>
                        <li>• <kbd>Escape</kbd> - Close suggestions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Language Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Language</CardTitle>
                <CardDescription>Choose your programming language</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={language} onValueChange={setLanguage}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="javascript">JS</TabsTrigger>
                    <TabsTrigger value="typescript">TS</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Examples</CardTitle>
                <CardDescription>Try these code examples</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setCode(examples.javascript)}
                >
                  JavaScript Function
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setCode(examples.typescript)}
                >
                  TypeScript Interface
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setCode(examples.python)}
                >
                  Python Function
                </Button>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Features</CardTitle>
                <CardDescription>AI-powered completion features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Context-aware suggestions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Multi-language support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Local + AI completions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Keyboard navigation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Real-time suggestions</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            {completions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Session</CardTitle>
                  <CardDescription>Completion statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Suggestions:</span>
                      <span className="text-sm font-medium">{completions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">AI Powered:</span>
                      <span className="text-sm font-medium">
                        {completions.filter(c => c.source === 'ai').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Local Rules:</span>
                      <span className="text-sm font-medium">
                        {completions.filter(c => c.source === 'local').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          </div>
          </TabsContent>

          {/* Collaboration Tab */}
          <TabsContent value="collaboration" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <CardTitle>Real-time Collaborative Editor</CardTitle>
                  </div>
                  <Button onClick={generateNewRoom} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Room
                  </Button>
                </div>
                <CardDescription>
                  Share this room with others to collaborate in real-time using CRDT technology
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Room ID:</p>
                      <p className="text-lg font-mono font-bold text-blue-600">{roomId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Your Name:</p>
                      <p className="text-lg font-mono font-bold text-green-600">{userName}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Share the Room ID with others to collaborate together in real-time!
                  </p>
                </div>

                <EditorCollab
                  roomId={roomId}
                  userId={userId}
                  userName={userName}
                  initialContent={collabContent}
                  onContentChange={setCollabContent}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agentic Developer Tab */}
          <TabsContent value="agentic" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <CardTitle>AI-Powered Development Agent</CardTitle>
                </div>
                <CardDescription>
                  Describe your goals and let the AI agent plan, execute, and manage development tasks automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgenticDeveloper />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}