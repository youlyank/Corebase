'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useIDEStore } from '@/lib/ide/store';
import { ideSyncManager } from '@/lib/ide/sync';
import { ideAPIManager } from '@/lib/ide/api';

interface MonacoEditorProps {
  height?: string | number;
  theme?: string;
  options?: any;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  height = '100%',
  theme = 'vs-dark',
  options = {}
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  
  const {
    currentFile,
    updateFileContent,
    sendCursorUpdate,
    projectId
  } = useIDEStore();

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure advanced editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
      lineNumbers: 'on',
      minimap: { enabled: true, side: 'right' },
      wordWrap: 'on',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      rulers: [80, 120],
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
        highlightActiveIndentation: true
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showClasses: true,
        showFunctions: true,
        showVariables: true,
        showModules: true
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false
      },
      parameterHints: { enabled: true },
      hover: { enabled: true },
      codeLens: { enabled: true },
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      semanticHighlighting: { enabled: true },
      multiCursorModifier: 'ctrlCmd',
      accessibilitySupport: 'auto',
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
      cursorBlinking: 'smooth',
      renderLineHighlight: 'line',
      renderControlCharacters: false,
      renderIndentGuides: true,
      ...options
    });

    // Register custom keyboard shortcuts
    registerKeyboardShortcuts(editor, monaco);

    // Setup advanced features
    setupAdvancedFeatures(editor, monaco);

    // Setup collaboration features
    setupCollaborationFeatures(editor, monaco);

    // Setup auto-save and change tracking
    setupChangeTracking(editor, monaco);

  }, [currentFile, updateFileContent, sendCursorUpdate, projectId, options]);

  const handleSave = useCallback(async () => {
    if (!currentFile || !editorRef.current) return;

    try {
      const content = editorRef.current.getValue();
      await ideAPIManager.saveFile(currentFile.id, content);
      
      // Notify collaborators
      if (projectId) {
        ideSyncManager.saveFile(currentFile.id, content);
      }
      
      // Show save indicator (could add a toast notification)
      console.log('File saved:', currentFile.name);
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }, [currentFile, projectId]);

  // Register keyboard shortcuts
  const registerKeyboardShortcuts = useCallback((editor: any, monaco: any) => {
    // Save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // Quick Open / Command Palette
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      showCommandPalette(editor, monaco, 'quickOpen');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => {
      showCommandPalette(editor, monaco, 'command');
    });

    // Multi-cursor operations
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      // Select next occurrence
      const selection = editor.getSelection();
      if (selection.isEmpty()) {
        editor.action('editor.action.addSelectionToNextFindMatch');
      } else {
        editor.action('editor.action.addSelectionToNextFindMatch');
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
      editor.action('editor.action.insertCursorBelow');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
      editor.action('editor.action.insertCursorAbove');
    });

    // Format document
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.action('editor.action.formatDocument');
    });

    // Toggle comment
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      editor.action('editor.action.commentLine');
    });

    // Go to definition
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F12, () => {
      editor.action('editor.action.revealDefinition');
    });

    // Find references
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F12, () => {
      editor.action('editor.action.goToReferences');
    });

    // Rename symbol
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      editor.action('editor.action.rename');
    });

    // Quick fix
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
      editor.action('editor.action.quickFix');
    });
  }, [handleSave]);

  // Setup advanced features
  const setupAdvancedFeatures = useCallback((editor: any, monaco: any) => {
    // Setup IntelliSense
    setupIntelliSense(editor, monaco);

    // Setup code actions
    setupCodeActions(editor, monaco);

    // Setup diagnostics
    setupDiagnostics(editor, monaco);

    // Setup snippets
    setupSnippets(editor, monaco);
  }, []);

  // Setup collaboration features
  const setupCollaborationFeatures = useCallback((editor: any, monaco: any) => {
    // Cursor position tracking
    editor.onDidChangeCursorPosition((e: any) => {
      const position = e.position;
      sendCursorUpdate(position.lineNumber, position.column);
      
      // Send cursor update to collaborators
      if (projectId) {
        ideSyncManager.sendCursorPosition(position.lineNumber, position.column);
      }
    });

    // Selection tracking
    editor.onDidChangeCursorSelection((e: any) => {
      const selection = e.selection;
      if (!selection.isEmpty() && projectId) {
        ideSyncManager.sendSelection(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        );
      }
    });

    // Remote cursors and decorations
    setupRemoteCursors(editor, monaco);
  }, [sendCursorUpdate, projectId]);

  // Setup change tracking
  const setupChangeTracking = useCallback((editor: any, monaco: any) => {
    let saveTimeout: NodeJS.Timeout;
    
    editor.onDidChangeModelContent((e: any) => {
      const content = editor.getValue();
      if (currentFile) {
        updateFileContent(currentFile.id, content);
        
        // Send changes to collaborators
        if (projectId) {
          e.changes.forEach((change: any) => {
            ideSyncManager.sendOperation({
              type: change.text ? 'insert' : 'delete',
              position: change.rangeOffset,
              content: change.text,
              length: change.rangeLength
            });
          });
        }
        
        // Debounced save
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          handleSave();
        }, 1000);
      }
    });

    // Track dirty state
    editor.onDidChangeModelContent(() => {
      // Update tab indicator to show unsaved changes
      if (currentFile) {
        // This would update the UI to show dirty state
        console.log(`File ${currentFile.name} has unsaved changes`);
      }
    });
  }, [currentFile, updateFileContent, projectId, handleSave]);

  // Show command palette
  const showCommandPalette = useCallback((editor: any, monaco: any, type: 'quickOpen' | 'command') => {
    // This would open a command palette overlay
    console.log(`Opening ${type} palette`);
    
    // In a full implementation, this would:
    // 1. Create an overlay component
    // 2. Show available commands/files
    // 3. Handle keyboard navigation
    // 4. Execute selected command
  }, []);

  // Setup IntelliSense
  const setupIntelliSense = useCallback((editor: any, monaco: any) => {
    // Register custom language providers
    const language = getLanguageFromExtension(currentFile?.name || '');
    
    // Add custom completions based on project context
    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: (model: any, position: any) => {
        // Return context-aware suggestions
        return { suggestions: [] };
      }
    });

    // Add hover provider for documentation
    monaco.languages.registerHoverProvider(language, {
      provideHover: (model: any, position: any) => {
        // Return documentation hover
        return { contents: [] };
      }
    });
  }, [currentFile]);

  // Setup code actions
  const setupCodeActions = useCallback((editor: any, monaco: any) => {
    // Register code action provider
    monaco.languages.registerCodeActionProvider('*', {
      provideCodeActions: (model: any, range: any) => {
        // Return available code actions
        return { actions: [], dispose: () => {} };
      }
    });
  }, []);

  // Setup diagnostics
  const setupDiagnostics = useCallback((editor: any, monaco: any) => {
    // Create diagnostic collection
    const diagnostics = monaco.languages.createDiagnosticCollection('corebase');
    
    // Update diagnostics based on code analysis
    const updateDiagnostics = () => {
      if (currentFile) {
        // This would run linters and type checkers
        const markers = [];
        diagnostics.set(currentFile.uri || '', markers);
      }
    };

    updateDiagnostics();
  }, [currentFile]);

  // Setup snippets
  const setupSnippets = useCallback((editor: any, monaco: any) => {
    const language = getLanguageFromExtension(currentFile?.name || '');
    
    // Register custom snippets
    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions = [
          {
            label: 'for loop',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'for (let ${1:index} = 0; ${1:index} < ${2:array}.length; ${1:index}++) {\n  ${3:// code}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'function',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'function ${1:functionName}(${2:parameters}) {\n  ${3:// body}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          }
        ];

        return { suggestions };
      }
    });
  }, [currentFile]);

  // Setup remote cursors
  const setupRemoteCursors = useCallback((editor: any, monaco: any) => {
    // Create decoration types for remote cursors
    const decorationTypes = new Map();
    
    // Listen for remote cursor updates
    const handleRemoteCursor = (userId: string, position: any, color: string) => {
      // Remove old decoration
      if (decorationTypes.has(userId)) {
        decorationTypes.get(userId).dispose();
      }
      
      // Add new decoration
      const decorationType = editor.createDecorationsCollection([{
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        options: {
          className: `remote-cursor-${userId}`,
          hoverMessage: { value: `User ${userId}` },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      }]);
      
      decorationTypes.set(userId, decorationType);
    };

    // This would connect to the collaboration engine
    // crdtCollaborationEngine.on('cursorUpdated', handleRemoteCursor);
  }, []);

  const handleLanguageChange = useCallback((language: string) => {
    if (monacoRef.current && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, language);
      }
    }
  }, []);

  // Update editor when current file changes
  useEffect(() => {
    if (editorRef.current && currentFile) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== currentFile.content) {
        model.setValue(currentFile.content || '');
      }
      
      // Set language based on file extension
      const language = getLanguageFromExtension(currentFile.name);
      handleLanguageChange(language);
    }
  }, [currentFile, handleLanguageChange]);

  // Configure advanced Monaco themes
  useEffect(() => {
    if (monacoRef.current) {
      // CoreBase Dark Theme - Professional dark theme with blue accents
      monacoRef.current.editor.defineTheme('corebase-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
          { token: 'comment.doc', foreground: '6a737d', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'keyword.control', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'keyword.operator', foreground: 'f97583' },
          { token: 'string', foreground: '9ecbff' },
          { token: 'string.template', foreground: '9ecbff' },
          { token: 'string.regex', foreground: 'ffab70' },
          { token: 'number', foreground: '79b8ff' },
          { token: 'constant', foreground: '79b8ff' },
          { token: 'constant.language', foreground: '79b8ff' },
          { token: 'function', foreground: 'b392f0', fontStyle: 'bold' },
          { token: 'function.decorator', foreground: 'b392f0' },
          { token: 'variable', foreground: 'e1e4e8' },
          { token: 'variable.parameter', foreground: 'e1e4e8' },
          { token: 'type', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'class', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'interface', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'enum', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'namespace', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'module', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'decorator', foreground: '79b8ff' },
          { token: 'property', foreground: '79b8ff' },
          { token: 'method', foreground: 'b392f0' },
          { token: 'tag', foreground: '85e89d' },
          { token: 'attribute.name', foreground: '79b8ff' },
          { token: 'attribute.value', foreground: '9ecbff' },
          { token: 'punctuation', foreground: 'e1e4e8' },
          { token: 'punctuation.definition', foreground: 'e1e4e8' },
          { token: 'meta', foreground: 'e1e4e8' },
          { token: 'meta.brace', foreground: 'e1e4e8' },
          { token: 'meta.delimiter', foreground: 'e1e4e8' },
          { token: 'support', foreground: '85e89d' },
          { token: 'support.function', foreground: 'b392f0' },
          { token: 'support.type', foreground: 'f97583' },
          { token: 'support.class', foreground: 'f97583' },
          { token: 'support.variable', foreground: '79b8ff' },
          { token: 'entity', foreground: '79b8ff' },
          { token: 'entity.name', foreground: '79b8ff' },
          { token: 'entity.name.function', foreground: 'b392f0' },
          { token: 'entity.name.class', foreground: 'f97583' },
          { token: 'entity.name.type', foreground: 'f97583' },
          { token: 'invalid', foreground: 'f85149', fontStyle: 'bold' },
          { token: 'invalid.deprecated', foreground: 'f85149', fontStyle: 'bold' }
        ],
        colors: {
          'editor.background': '#0d1117',
          'editor.foreground': '#e1e4e8',
          'editor.lineHighlightBackground': '#161b22',
          'editor.lineHighlightBorder': '#161b22',
          'editorCursor.foreground': '#58a6ff',
          'editorCursor.background': '#0d1117',
          'editorWhitespace.foreground': '#30363d',
          'editorIndentGuide.background': '#30363d',
          'editorIndentGuide.activeBackground': '#21262d',
          'editor.selectionBackground': '#264f78',
          'editor.selectionHighlightBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#1f2428',
          'editor.wordHighlightBackground': '#264f78',
          'editor.wordHighlightStrongBackground': '#264f78',
          'editorLineNumber.foreground': '#484f58',
          'editorLineNumber.activeForeground': '#e1e4e8',
          'editorHoverHighlightBackground': '#264f78',
          'editorLink.activeForeground': '#58a6ff',
          'editor.findMatchBackground': '#264f78',
          'editor.findMatchHighlightBackground': '#264f78',
          'editorOverviewRuler.border': '#30363d',
          'editorOverviewRuler.findMatchForeground': '#58a6ff',
          'editorOverviewRuler.selectionForeground': '#264f78',
          'editorError.foreground': '#f85149',
          'editorWarning.foreground': '#d29922',
          'editorInfo.foreground': '#58a6ff',
          'editorHint.foreground': '#3fb950',
          'editorGutter.modifiedBackground': '#1f6feb',
          'editorGutter.addedBackground': '#238636',
          'editorGutter.deletedBackground': '#da3633',
          'editorBracketMatch.background': '#264f78',
          'editorBracketMatch.border': '#58a6ff',
          'editorWidget.background': '#161b22',
          'editorWidget.border': '#30363d',
          'editorWidget.foreground': '#e1e4e8',
          'editorSuggestWidget.background': '#161b22',
          'editorSuggestWidget.border': '#30363d',
          'editorSuggestWidget.foreground': '#e1e4e8',
          'editorSuggestWidget.highlightForeground': '#58a6ff',
          'editorSuggestWidget.selectedBackground': '#264f78',
          'editorHoverWidget.background': '#161b22',
          'editorHoverWidget.border': '#30363d',
          'editorHoverWidget.foreground': '#e1e4e8',
          'editorMarkerNavigation.background': '#161b22',
          'editorMarkerNavigation.border': '#30363d',
          'editorMarkerNavigationError.background': '#f85149',
          'editorMarkerNavigationWarning.background': '#d29922',
          'editorMarkerNavigationInfo.background': '#58a6ff',
          'peekView.border': '#30363d',
          'peekView.background': '#161b22',
          'peekViewTitle.background': '#1f2428',
          'peekViewEditor.background': '#0d1117',
          'peekViewEditor.matchHighlightBackground': '#264f78',
          'peekViewResult.background': '#161b22',
          'peekViewResult.fileForeground': '#e1e4e8',
          'peekViewResult.lineForeground': '#8b949e',
          'peekViewResult.matchHighlightBackground': '#264f78',
          'peekViewResult.selectionBackground': '#264f78',
          'peekViewResult.selectionForeground': '#e1e4e8',
          'panel.background': '#0d1117',
          'panel.border': '#30363d',
          'panelTitle.activeBorder': '#58a6ff',
          'panelTitle.activeForeground': '#e1e4e8',
          'panelTitle.inactiveForeground': '#8b949e',
          'statusBar.background': '#161b22',
          'statusBar.border': '#30363d',
          'statusBar.foreground': '#e1e4e8',
          'statusBar.noFolderBackground': '#161b22',
          'statusBar.debuggingBackground': '#f85149',
          'statusBar.debuggingForeground': '#ffffff',
          'tab.activeBackground': '#0d1117',
          'tab.activeBorder': '#58a6ff',
          'tab.activeBorderTop': '#58a6ff',
          'tab.activeForeground': '#e1e4e8',
          'tab.inactiveBackground': '#161b22',
          'tab.inactiveForeground': '#8b949e',
          'tab.border': '#30363d',
          'editorGroupHeader.tabsBackground': '#161b22',
          'editorGroupHeader.noTabsBackground': '#0d1117',
          'editorGroup.border': '#30363d',
          'editorGroup.dropBackground': '#264f78',
          'activityBar.background': '#010409',
          'activityBar.border': '#30363d',
          'activityBar.foreground': '#e1e4e8',
          'activityBar.inactiveForeground': '#8b949e',
          'activityBarBadge.background': '#1f6feb',
          'activityBarBadge.foreground': '#ffffff',
          'sideBar.background': '#010409',
          'sideBar.border': '#30363d',
          'sideBar.foreground': '#e1e4e8',
          'sideBarTitle.foreground': '#e1e4e8',
          'sideBarSectionHeader.background': '#161b22',
          'sideBarSectionHeader.foreground': '#e1e4e8',
          'minimap.background': '#0d1117',
          'minimap.selectionHighlight': '#264f78',
          'minimap.errorHighlight': '#f85149',
          'minimap.warningHighlight': '#d29922',
          'minimap.findMatchHighlight': '#264f78',
          'minimapSlider.background': '#30363d',
          'minimapSlider.hoverBackground': '#484f58',
          'minimapSlider.activeBackground': '#58a6ff',
          'problemsErrorIcon.foreground': '#f85149',
          'problemsWarningIcon.foreground': '#d29922',
          'problemsInfoIcon.foreground': '#58a6ff',
          'scrollbar.shadow': '#000000',
          'scrollbarSlider.background': '#30363d',
          'scrollbarSlider.hoverBackground': '#484f58',
          'scrollbarSlider.activeBackground': '#58a6ff',
          'badge.background': '#1f6feb',
          'badge.foreground': '#ffffff',
          'progressBar.background': '#1f6feb',
          'widget.shadow': '#000000',
          'input.background': '#0d1117',
          'input.border': '#30363d',
          'input.foreground': '#e1e4e8',
          'input.placeholderForeground': '#8b949e',
          'inputValidation.errorBackground': '#f85149',
          'inputValidation.errorBorder': '#f85149',
          'inputValidation.warningBackground': '#d29922',
          'inputValidation.warningBorder': '#d29922',
          'dropdown.background': '#161b22',
          'dropdown.border': '#30363d',
          'dropdown.foreground': '#e1e4e8',
          'list.activeSelectionBackground': '#264f78',
          'list.activeSelectionForeground': '#e1e4e8',
          'list.inactiveSelectionBackground': '#1f2428',
          'list.inactiveSelectionForeground': '#e1e4e8',
          'list.hoverBackground': '#1f2428',
          'list.hoverForeground': '#e1e4e8',
          'list.focusBackground': '#264f78',
          'list.focusForeground': '#e1e4e8',
          'tree.indentGuidesStroke': '#30363d',
          'button.background': '#1f6feb',
          'button.foreground': '#ffffff',
          'button.hoverBackground': '#2c5aa0',
          'button.secondaryBackground': '#21262d',
          'button.secondaryForeground': '#e1e4e8',
          'button.secondaryHoverBackground': '#30363d',
          'checkbox.background': '#21262d',
          'checkbox.border': '#30363d',
          'checkbox.foreground': '#e1e4e8',
          'keybindingLabel.background': '#161b22',
          'keybindingLabel.border': '#30363d',
          'keybindingLabel.foreground': '#e1e4e8',
          'keybindingLabel.bottomBorder': '#30363d',
          'descriptionForeground': '#8b949e',
          'errorForeground': '#f85149',
          'warningForeground': '#d29922',
          'infoForeground': '#58a6ff',
          'border': '#30363d',
          'focusBorder': '#58a6ff',
          'contrastBorder': '#30363d',
          'contrastActiveBorder': '#58a6ff',
          'widget.shadow': '#000000',
          'selection.background': '#264f78',
          'textSeparator.foreground': '#8b949e',
          'titleBar.activeBackground': '#010409',
          'titleBar.activeForeground': '#e1e4e8',
          'titleBar.inactiveBackground': '#010409',
          'titleBar.inactiveForeground': '#8b949e',
          'titleBar.border': '#30363d'
        }
      });

      // CoreBase Light Theme - Professional light theme
      monacoRef.current.editor.defineTheme('corebase-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'd73a49', fontStyle: 'bold' },
          { token: 'string', foreground: '032f62' },
          { token: 'number', foreground: '005cc5' },
          { token: 'function', foreground: '6f42c1', fontStyle: 'bold' },
          { token: 'variable', foreground: '24292e' },
          { token: 'type', foreground: 'd73a49', fontStyle: 'bold' },
          { token: 'class', foreground: 'd73a49', fontStyle: 'bold' },
          { token: 'interface', foreground: 'd73a49', fontStyle: 'bold' },
          { token: 'property', foreground: '005cc5' },
          { token: 'method', foreground: '6f42c1' },
          { token: 'tag', foreground: '22863a' },
          { token: 'attribute.name', foreground: '005cc5' },
          { token: 'attribute.value', foreground: '032f62' }
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#24292e',
          'editor.lineHighlightBackground': '#f6f8fa',
          'editorCursor.foreground': '#044289',
          'editorWhitespace.foreground': '#d1d5da',
          'editorIndentGuide.background': '#e1e4e8',
          'editorIndentGuide.activeBackground': '#d1d5da',
          'editor.selectionBackground': '#0366d620',
          'editor.inactiveSelectionBackground': '#0366d615',
          'editorLineNumber.foreground': '#1b1f234d',
          'editorLineNumber.activeForeground': '#1b1f23',
          'editor.selectionHighlightBackground': '#0366d615',
          'editorHoverHighlightBackground': '#0366d615',
          'editorLink.activeForeground': '#0366d6',
          'editor.findMatchBackground': '#ffd33d44',
          'editor.findMatchHighlightBackground': '#ffd33d22',
          'editorWidget.background': '#ffffff',
          'editorWidget.border': '#e1e4e8',
          'editorSuggestWidget.background': '#ffffff',
          'editorSuggestWidget.border': '#e1e4e8',
          'editorSuggestWidget.foreground': '#24292e',
          'editorSuggestWidget.highlightForeground': '#0366d6',
          'editorSuggestWidget.selectedBackground': '#0366d615',
          'editorHoverWidget.background': '#ffffff',
          'editorHoverWidget.border': '#e1e4e8',
          'editorHoverWidget.foreground': '#24292e',
          'peekView.border': '#e1e4e8',
          'peekView.background': '#ffffff',
          'peekViewTitle.background': '#f6f8fa',
          'peekViewEditor.background': '#ffffff',
          'peekViewEditor.matchHighlightBackground': '#ffd33d44',
          'peekViewResult.background': '#ffffff',
          'peekViewResult.fileForeground': '#24292e',
          'peekViewResult.lineForeground': '#586069',
          'peekViewResult.matchHighlightBackground': '#ffd33d44',
          'peekViewResult.selectionBackground': '#0366d615',
          'peekViewResult.selectionForeground': '#24292e',
          'panel.background': '#ffffff',
          'panel.border': '#e1e4e8',
          'statusBar.background': '#f6f8fa',
          'statusBar.border': '#e1e4e8',
          'statusBar.foreground': '#24292e',
          'tab.activeBackground': '#ffffff',
          'tab.activeBorder': '#0366d6',
          'tab.activeBorderTop': '#0366d6',
          'tab.activeForeground': '#24292e',
          'tab.inactiveBackground': '#f6f8fa',
          'tab.inactiveForeground': '#586069',
          'tab.border': '#e1e4e8',
          'editorGroupHeader.tabsBackground': '#f6f8fa',
          'editorGroupHeader.noTabsBackground': '#ffffff',
          'editorGroup.border': '#e1e4e8',
          'activityBar.background': '#ffffff',
          'activityBar.border': '#e1e4e8',
          'activityBar.foreground': '#24292e',
          'activityBar.inactiveForeground': '#586069',
          'sideBar.background': '#f6f8fa',
          'sideBar.border': '#e1e4e8',
          'sideBar.foreground': '#24292e',
          'sideBarTitle.foreground': '#24292e',
          'sideBarSectionHeader.background': '#e1e4e8',
          'sideBarSectionHeader.foreground': '#24292e',
          'minimap.background': '#ffffff',
          'minimap.selectionHighlight': '#0366d620',
          'minimap.errorHighlight': '#cb2431',
          'minimap.warningHighlight': '#f66a0a',
          'minimap.findMatchHighlight': '#ffd33d44',
          'scrollbar.shadow': '#00000000',
          'scrollbarSlider.background': '#e1e4e8',
          'scrollbarSlider.hoverBackground': '#d1d5da',
          'scrollbarSlider.activeBackground': '#0366d6',
          'badge.background': '#0366d6',
          'badge.foreground': '#ffffff',
          'progressBar.background': '#0366d6',
          'widget.shadow': '#00000000',
          'input.background': '#ffffff',
          'input.border': '#e1e4e8',
          'input.foreground': '#24292e',
          'input.placeholderForeground': '#586069',
          'dropdown.background': '#ffffff',
          'dropdown.border': '#e1e4e8',
          'dropdown.foreground': '#24292e',
          'list.activeSelectionBackground': '#0366d615',
          'list.activeSelectionForeground': '#24292e',
          'list.inactiveSelectionBackground': '#e1e4e8',
          'list.inactiveSelectionForeground': '#24292e',
          'list.hoverBackground': '#f6f8fa',
          'list.hoverForeground': '#24292e',
          'list.focusBackground': '#0366d615',
          'list.focusForeground': '#24292e',
          'button.background': '#0366d6',
          'button.foreground': '#ffffff',
          'button.hoverBackground': '#0256cc',
          'button.secondaryBackground': '#f6f8fa',
          'button.secondaryForeground': '#24292e',
          'button.secondaryHoverBackground': '#e1e4e8',
          'checkbox.background': '#ffffff',
          'checkbox.border': '#e1e4e8',
          'checkbox.foreground': '#24292e',
          'keybindingLabel.background': '#f6f8fa',
          'keybindingLabel.border': '#e1e4e8',
          'keybindingLabel.foreground': '#24292e',
          'descriptionForeground': '#586069',
          'errorForeground': '#cb2431',
          'warningForeground': '#f66a0a',
          'infoForeground': '#0366d6',
          'border': '#e1e4e8',
          'focusBorder': '#0366d6',
          'contrastBorder': '#e1e4e8',
          'contrastActiveBorder': '#0366d6',
          'selection.background': '#0366d620',
          'textSeparator.foreground': '#586069',
          'titleBar.activeBackground': '#ffffff',
          'titleBar.activeForeground': '#24292e',
          'titleBar.inactiveBackground': '#ffffff',
          'titleBar.inactiveForeground': '#586069',
          'titleBar.border': '#e1e4e8'
        }
      });

      // GitHub High Contrast Theme
      monacoRef.current.editor.defineTheme('github-high-contrast', {
        base: 'hc-black',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'string', foreground: '9ecbff' },
          { token: 'number', foreground: '79b8ff' },
          { token: 'function', foreground: 'b392f0', fontStyle: 'bold' },
          { token: 'variable', foreground: 'e1e4e8' },
          { token: 'type', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'class', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'interface', foreground: 'f97583', fontStyle: 'bold' },
          { token: 'property', foreground: '79b8ff' },
          { token: 'method', foreground: 'b392f0' },
          { token: 'tag', foreground: '85e89d' },
          { token: 'attribute.name', foreground: '79b8ff' },
          { token: 'attribute.value', foreground: '9ecbff' }
        ],
        colors: {
          'editor.background': '#000000',
          'editor.foreground': '#ffffff',
          'editor.lineHighlightBackground': '#333333',
          'editorCursor.foreground': '#ffffff',
          'editorWhitespace.foreground': '#666666',
          'editorIndentGuide.background': '#666666',
          'editorIndentGuide.activeBackground': '#999999',
          'editor.selectionBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#333333',
          'editorLineNumber.foreground': '#666666',
          'editorLineNumber.activeForeground': '#ffffff',
          'editorWidget.background': '#000000',
          'editorWidget.border': '#666666',
          'editorWidget.foreground': '#ffffff',
          'editorSuggestWidget.background': '#000000',
          'editorSuggestWidget.border': '#666666',
          'editorSuggestWidget.foreground': '#ffffff',
          'editorSuggestWidget.highlightForeground': '#58a6ff',
          'editorSuggestWidget.selectedBackground': '#264f78',
          'editorHoverWidget.background': '#000000',
          'editorHoverWidget.border': '#666666',
          'editorHoverWidget.foreground': '#ffffff',
          'button.background': '#264f78',
          'button.foreground': '#ffffff',
          'button.hoverBackground': '#58a6ff',
          'input.background': '#000000',
          'input.border': '#666666',
          'input.foreground': '#ffffff',
          'dropdown.background': '#000000',
          'dropdown.border': '#666666',
          'dropdown.foreground': '#ffffff',
          'list.activeSelectionBackground': '#264f78',
          'list.activeSelectionForeground': '#ffffff',
          'list.inactiveSelectionBackground': '#333333',
          'list.inactiveSelectionForeground': '#ffffff',
          'list.hoverBackground': '#333333',
          'list.hoverForeground': '#ffffff',
          'list.focusBackground': '#264f78',
          'list.focusForeground': '#ffffff',
          'border': '#666666',
          'focusBorder': '#58a6ff',
          'contrastBorder': '#ffffff',
          'contrastActiveBorder': '#58a6ff',
          'selection.background': '#264f78',
          'textSeparator.foreground': '#666666',
          'titleBar.activeBackground': '#000000',
          'titleBar.activeForeground': '#ffffff',
          'titleBar.inactiveBackground': '#000000',
          'titleBar.inactiveForeground': '#666666',
          'titleBar.border': '#666666',
          'activityBar.background': '#000000',
          'activityBar.border': '#666666',
          'activityBar.foreground': '#ffffff',
          'activityBar.inactiveForeground': '#666666',
          'sideBar.background': '#000000',
          'sideBar.border': '#666666',
          'sideBar.foreground': '#ffffff',
          'sideBarTitle.foreground': '#ffffff',
          'sideBarSectionHeader.background': '#333333',
          'sideBarSectionHeader.foreground': '#ffffff',
          'statusBar.background': '#000000',
          'statusBar.border': '#666666',
          'statusBar.foreground': '#ffffff',
          'tab.activeBackground': '#000000',
          'tab.activeBorder': '#58a6ff',
          'tab.activeBorderTop': '#58a6ff',
          'tab.activeForeground': '#ffffff',
          'tab.inactiveBackground': '#333333',
          'tab.inactiveForeground': '#666666',
          'tab.border': '#666666',
          'editorGroupHeader.tabsBackground': '#333333',
          'editorGroupHeader.noTabsBackground': '#000000',
          'editorGroup.border': '#666666',
          'minimap.background': '#000000',
          'minimap.selectionHighlight': '#264f78',
          'minimap.errorHighlight': '#f85149',
          'minimap.warningHighlight': '#d29922',
          'minimap.findMatchHighlight': '#264f78',
          'scrollbar.shadow': '#000000',
          'scrollbarSlider.background': '#666666',
          'scrollbarSlider.hoverBackground': '#999999',
          'scrollbarSlider.activeBackground': '#58a6ff',
          'badge.background': '#264f78',
          'badge.foreground': '#ffffff',
          'progressBar.background': '#264f78',
          'widget.shadow': '#000000',
          'panel.background': '#000000',
          'panel.border': '#666666',
          'panelTitle.activeBorder': '#58a6ff',
          'panelTitle.activeForeground': '#ffffff',
          'panelTitle.inactiveForeground': '#666666',
          'checkbox.background': '#000000',
          'checkbox.border': '#666666',
          'checkbox.foreground': '#ffffff',
          'keybindingLabel.background': '#333333',
          'keybindingLabel.border': '#666666',
          'keybindingLabel.foreground': '#ffffff',
          'descriptionForeground': '#666666',
          'errorForeground': '#f85149',
          'warningForeground': '#d29922',
          'infoForeground': '#58a6ff'
        }
      });
    }
  }, []);

  if (!currentFile) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <div className="text-xl">No file selected</div>
          <div className="text-sm mt-2">Select a file from the explorer to start editing</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">{currentFile.name}</span>
          <span className="text-xs text-gray-600">
            {getLanguageFromExtension(currentFile.name)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Save (Ctrl+S)
          </button>
        </div>
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height={height}
          theme="corebase-dark"
          defaultLanguage={getLanguageFromExtension(currentFile.name)}
          value={currentFile.content || ''}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading editor...</div>
            </div>
          }
        />
      </div>
    </div>
  );
};

// Helper function to detect language from file extension
function getLanguageFromExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'dockerfile': 'dockerfile',
    'docker': 'dockerfile',
    'vue': 'vue',
    'svelte': 'svelte'
  };
  
  return languageMap[extension || ''] || 'plaintext';
}