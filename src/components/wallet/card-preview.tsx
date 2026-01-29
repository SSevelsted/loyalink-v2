'use client'

import type { TierTheme, CardField } from '@/types/database'

type CardPreviewProps = {
  tierTheme: TierTheme
  logoUrl: string | null
  stripUrl: string | null
  studioName: string
  cardFields: CardField[]
  iconUrl?: string | null
}

export function CardPreview({
  tierTheme,
  logoUrl,
  stripUrl,
  studioName,
  cardFields,
  iconUrl,
}: CardPreviewProps) {
  const { backgroundColor, foregroundColor, labelColor, logoOverride } = tierTheme
  const activeLogo = logoOverride || logoUrl

  // Map fields by key for positioning
  const fieldMap = Object.fromEntries(cardFields.map((f) => [f.key, f]))
  const balanceField = fieldMap['balance']
  const memberField = fieldMap['member']
  const cashbackField = fieldMap['cashback']

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Card */}
      <div
        className="w-full max-w-[340px] rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor }}
      >
        {/* Header: Logo/Name left, Balance right */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {activeLogo ? (
              <img
                src={activeLogo}
                alt="Logo"
                className="h-8 max-w-[120px] object-contain"
              />
            ) : (
              <span
                className="text-lg font-bold italic"
                style={{ color: foregroundColor }}
              >
                {studioName}
              </span>
            )}
          </div>
          {balanceField && (
            <div className="text-right">
              <div
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: labelColor }}
              >
                {balanceField.label}:
              </div>
              <div
                className="text-base font-bold"
                style={{ color: foregroundColor }}
              >
                {balanceField.value}
              </div>
            </div>
          )}
        </div>

        {/* Strip / center image */}
        <img
          src={stripUrl || '/images/default-strip.png'}
          alt="Strip"
          className="w-full h-[140px] object-cover"
        />

        {/* Bottom fields: Member left, Cashback right */}
        <div className="flex items-start justify-between px-4 py-3">
          {memberField && (
            <div>
              <div
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: labelColor }}
              >
                {memberField.label}
              </div>
              <div
                className="text-sm font-semibold mt-0.5"
                style={{ color: foregroundColor }}
              >
                {memberField.value}
              </div>
            </div>
          )}
          {cashbackField && (
            <div className="text-right">
              <div
                className="text-[10px] font-semibold uppercase tracking-wider leading-tight"
                style={{ color: labelColor }}
              >
                {cashbackField.label}
              </div>
              <div
                className="text-sm font-semibold mt-0.5"
                style={{ color: foregroundColor }}
              >
                {cashbackField.value}
              </div>
            </div>
          )}
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center pb-4 pt-1">
          <div className="bg-white p-2 rounded-lg">
            <svg viewBox="0 0 100 100" className="h-28 w-28">
              {/* Simplified QR pattern */}
              <rect x="0" y="0" width="100" height="100" fill="white" />
              {/* Position markers */}
              <rect x="4" y="4" width="24" height="24" fill="black" />
              <rect x="7" y="7" width="18" height="18" fill="white" />
              <rect x="10" y="10" width="12" height="12" fill="black" />
              <rect x="72" y="4" width="24" height="24" fill="black" />
              <rect x="75" y="7" width="18" height="18" fill="white" />
              <rect x="78" y="10" width="12" height="12" fill="black" />
              <rect x="4" y="72" width="24" height="24" fill="black" />
              <rect x="7" y="75" width="18" height="18" fill="white" />
              <rect x="10" y="78" width="12" height="12" fill="black" />
              {/* Data modules */}
              <rect x="34" y="4" width="4" height="4" fill="black" />
              <rect x="42" y="4" width="4" height="4" fill="black" />
              <rect x="50" y="4" width="4" height="4" fill="black" />
              <rect x="58" y="4" width="4" height="4" fill="black" />
              <rect x="34" y="12" width="4" height="4" fill="black" />
              <rect x="46" y="12" width="4" height="4" fill="black" />
              <rect x="54" y="12" width="4" height="4" fill="black" />
              <rect x="62" y="12" width="4" height="4" fill="black" />
              <rect x="38" y="20" width="4" height="4" fill="black" />
              <rect x="50" y="20" width="4" height="4" fill="black" />
              <rect x="34" y="34" width="4" height="4" fill="black" />
              <rect x="42" y="38" width="4" height="4" fill="black" />
              <rect x="50" y="34" width="4" height="4" fill="black" />
              <rect x="58" y="42" width="4" height="4" fill="black" />
              <rect x="66" y="34" width="4" height="4" fill="black" />
              <rect x="74" y="38" width="4" height="4" fill="black" />
              <rect x="82" y="34" width="4" height="4" fill="black" />
              <rect x="90" y="42" width="4" height="4" fill="black" />
              <rect x="34" y="50" width="4" height="4" fill="black" />
              <rect x="46" y="46" width="4" height="4" fill="black" />
              <rect x="54" y="54" width="4" height="4" fill="black" />
              <rect x="66" y="50" width="4" height="4" fill="black" />
              <rect x="78" y="46" width="4" height="4" fill="black" />
              <rect x="86" y="54" width="4" height="4" fill="black" />
              <rect x="42" y="62" width="4" height="4" fill="black" />
              <rect x="50" y="58" width="4" height="4" fill="black" />
              <rect x="62" y="62" width="4" height="4" fill="black" />
              <rect x="74" y="58" width="4" height="4" fill="black" />
              <rect x="82" y="66" width="4" height="4" fill="black" />
              <rect x="38" y="74" width="4" height="4" fill="black" />
              <rect x="50" y="70" width="4" height="4" fill="black" />
              <rect x="58" y="78" width="4" height="4" fill="black" />
              <rect x="70" y="74" width="4" height="4" fill="black" />
              <rect x="82" y="78" width="4" height="4" fill="black" />
              <rect x="90" y="70" width="4" height="4" fill="black" />
              <rect x="34" y="86" width="4" height="4" fill="black" />
              <rect x="46" y="82" width="4" height="4" fill="black" />
              <rect x="54" y="90" width="4" height="4" fill="black" />
              <rect x="66" y="86" width="4" height="4" fill="black" />
              <rect x="78" y="82" width="4" height="4" fill="black" />
              <rect x="86" y="90" width="4" height="4" fill="black" />
              <rect x="90" y="86" width="4" height="4" fill="black" />
            </svg>
          </div>
          <span
            className="text-[10px] mt-1.5 font-mono"
            style={{ color: labelColor }}
          >
            {'${pid}'}
          </span>
        </div>
      </div>

      {/* Notification banner */}
      <div className="w-full max-w-[340px] rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] px-4 py-3 flex items-center gap-3 shadow-lg">
        {iconUrl || activeLogo ? (
          <img
            src={iconUrl || activeLogo!}
            alt="Icon"
            className="h-10 w-10 rounded-xl object-contain bg-white shadow-sm"
          />
        ) : (
          <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-600">
            {studioName.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1C1C1E] dark:text-white truncate">
            {studioName}
          </p>
          <p className="text-xs text-[#8E8E93] truncate">
            Tell your members about their exclusive benefits
          </p>
        </div>
        <span className="text-xs text-[#8E8E93] shrink-0">now</span>
      </div>
    </div>
  )
}
