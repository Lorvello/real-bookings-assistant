
import React, { useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useAvailabilityOverrides } from '@/hooks/useAvailabilityOverrides';
import { Trash2, Plus } from 'lucide-react';
import { AddOverrideModal } from './AddOverrideModal';

interface OverrideManagerProps {
  calendarId: string;
}

export function OverrideManager({ calendarId }: OverrideManagerProps) {
  const { overrides, deleteOverride } = useAvailabilityOverrides(calendarId);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleDelete = async (overrideId: string) => {
    if (confirm('Weet je zeker dat je deze uitzondering wilt verwijderen?')) {
      await deleteOverride(overrideId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-foreground">Uitzonderingen & Vakanties</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1 px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-sm font-medium transition-colors"
        >
          <Plus className="h-3 w-3" />
          Toevoegen
        </button>
      </div>

      {/* Override List */}
      <div className="space-y-2">
        {overrides.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Geen uitzonderingen gepland</p>
            <p className="text-xs mt-1">Voeg vakanties of speciale openingstijden toe</p>
          </div>
        ) : (
          overrides.map((override) => (
            <div
              key={override.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg border"
            >
              <div className="flex-1">
                <div className="text-foreground text-sm font-medium">
                  {format(new Date(override.date), 'EEEE d MMMM yyyy', { locale: nl })}
                </div>
                <div className="text-muted-foreground text-xs mt-1">
                  {override.is_available ? (
                    override.start_time && override.end_time ? (
                      `Aangepaste tijden: ${override.start_time} - ${override.end_time}`
                    ) : (
                      'Beschikbaar met normale tijden'
                    )
                  ) : (
                    `${getOverrideIcon(override.reason)} ${override.reason || 'Niet beschikbaar'}`
                  )}
                </div>
              </div>
              <button 
                onClick={() => handleDelete(override.id)}
                className="text-destructive hover:text-destructive/80 p-1 rounded transition-colors"
                title="Verwijderen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Override Modal */}
      {showAddModal && (
        <AddOverrideModal
          calendarId={calendarId}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

function getOverrideIcon(reason?: string | null): string {
  if (!reason) return '🚫';
  
  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes('vakantie') || lowerReason.includes('holiday')) return '🏖️';
  if (lowerReason.includes('ziek') || lowerReason.includes('sick')) return '🤒';
  if (lowerReason.includes('vrij') || lowerReason.includes('free')) return '🎉';
  if (lowerReason.includes('feest') || lowerReason.includes('party')) return '🎊';
  
  return '🚫';
}
