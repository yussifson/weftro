import re
import os

files = [
    'src/pages/clipad/DecisionLedger.jsx',
    'src/pages/clipad/ActionItems.jsx',
    'src/pages/clipad/KnowledgeJourney.jsx'
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()

    # 1. Update the header
    # Replace bg-gradient... to background with bg-[#006065] text-white
    content = re.sub(r'bg-gradient-to-br.*?to-background', 'bg-[#006065] text-white', content)
    
    # 2. Update the cards and other components
    # bg-card -> bg-[#006065]
    content = content.replace('bg-card', 'bg-[#006065]')
    
    # text-foreground -> text-white
    content = content.replace('text-foreground', 'text-white')
    
    # text-muted-foreground -> text-white/70
    content = content.replace('text-muted-foreground', 'text-white/70')
    
    # border-border -> border-white/15
    content = content.replace('border-border', 'border-white/15')
    
    # bg-secondary -> bg-white/10
    content = content.replace('bg-secondary', 'bg-white/10')
    
    # hover:bg-secondary/80 or hover:bg-secondary -> hover:bg-white/20
    content = content.replace('hover:bg-secondary/80', 'hover:bg-white/20')
    content = content.replace('hover:bg-secondary', 'hover:bg-white/20')
    
    # text-secondary-foreground -> text-white
    content = content.replace('text-secondary-foreground', 'text-white')

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
    print(f'Processed {f}')
