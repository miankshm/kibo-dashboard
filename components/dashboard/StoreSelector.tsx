'use client'

import { Check, ChevronDown, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore, STORES, type StoreId } from '@/store/useStore'
import { getTranslation } from '@/lib/i18n'

export function StoreSelector() {
  const { selectedStoreId, setSelectedStoreId, language } = useStore()
  const text = getTranslation(language)
  const selectedStore = STORES.find((s) => s.id === selectedStoreId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[160px] justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            <span className="truncate">{selectedStore?.name[language] || text.storeSelector.placeholder}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {STORES.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => setSelectedStoreId(store.id as StoreId)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium">{store.name[language]}</span>
              <span className="text-xs text-muted-foreground">{store.location[language]}</span>
            </div>
            {selectedStoreId === store.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
