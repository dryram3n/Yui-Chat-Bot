/**
 * Markdown Formatter for Yui Chat Bot
 * Converts markdown-style text to HTML for message display
 */

// Main function to convert markdown text to HTML
function formatMarkdown(text) {
  if (!text) return '';
  
  let formattedText = text;
  
  // Escape HTML to prevent XSS
  formattedText = escapeHtml(formattedText);
  
  // Format bold: **text** or __text__
  formattedText = formattedText.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
  
  // Format italic: *text* or _text_
  formattedText = formattedText.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
  
  // Format strikethrough: ~~text~~
  formattedText = formattedText.replace(/~~(.*?)~~/g, '<del>$1</del>');
  
  // Format code blocks: ```language\ncode\n```
  formattedText = formattedText.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, (match, language, code) => {
    return `<pre class="code-block${language ? ' language-' + language : ''}"><code>${code}</code></pre>`;
  });
  
  // Format inline code: `code`
  formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Format unordered lists: - item or * item
  formattedText = formatLists(formattedText);
  
  // Format links: [text](url)
  formattedText = formattedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Replace line breaks with <br>
  formattedText = formattedText.replace(/\n/g, '<br>');
  
  return formattedText;
}

// Format lists (both ordered and unordered)
function formatLists(text) {
  const lines = text.split('\n');
  let inList = false;
  let listType = '';
  let formattedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for unordered list items: - item or * item
    const unorderedMatch = line.match(/^\s*[-*]\s+(.+)$/);
    
    // Check for ordered list items: 1. item
    const orderedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);
    
    if (unorderedMatch) {
      if (!inList || listType !== 'ul') {
        // Start a new unordered list
        if (inList) formattedLines.push('</ul>');
        formattedLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      formattedLines.push(`<li>${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      if (!inList || listType !== 'ol') {
        // Start a new ordered list
        if (inList) formattedLines.push(`</${listType}>`);
        formattedLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      formattedLines.push(`<li>${orderedMatch[2]}</li>`);
    } else {
      // Not a list item, close any open list
      if (inList) {
        formattedLines.push(`</${listType}>`);
        inList = false;
      }
      formattedLines.push(line);
    }
  }
  
  // Close any open list at the end
  if (inList) {
    formattedLines.push(`</${listType}>`);
  }
  
  return formattedLines.join('\n');
}

// Escape HTML to prevent XSS attacks
function escapeHtml(text) {
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, char => htmlEntities[char]);
}

// Export the formatter function
window.markdownFormatter = {
  format: formatMarkdown
};