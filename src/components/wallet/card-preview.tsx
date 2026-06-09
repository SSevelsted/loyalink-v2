'use client'

import { Pencil } from 'lucide-react'
import type { TierTheme, CardField } from '@/types/database'

type CardPreviewProps = {
  tierTheme: TierTheme
  logoUrl: string | null
  stripUrl: string | null
  studioName: string
  cardFields: CardField[]
  iconUrl?: string | null
  onClickLogo?: () => void
  onClickStrip?: () => void
  onClickIcon?: () => void
}

export function CardPreview({
  tierTheme,
  logoUrl,
  stripUrl,
  studioName,
  cardFields,
  iconUrl,
  onClickLogo,
  onClickStrip,
  onClickIcon,
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
          <div
            className={`relative flex items-center gap-2 ${onClickLogo ? 'group/logo cursor-pointer' : ''}`}
            onClick={onClickLogo}
          >
            {activeLogo ? (
              <img
                src={activeLogo}
                alt="Logo"
                className="h-12 max-w-[160px] object-contain"
              />
            ) : (
              <span
                className="text-lg font-bold italic"
                style={{ color: foregroundColor }}
              >
                {studioName}
              </span>
            )}
            {onClickLogo && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity rounded flex items-center justify-center">
                <Pencil className="h-3 w-3 text-white" />
              </div>
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
        <div
          className={`relative ${onClickStrip ? 'group/strip cursor-pointer' : ''}`}
          onClick={onClickStrip}
        >
          <img
            src={stripUrl || '/images/default-strip.png'}
            alt="Strip"
            className="w-full h-[140px] object-cover"
          />
          {onClickStrip && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/strip:opacity-100 transition-opacity flex items-center justify-center">
              <Pencil className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

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
            <svg viewBox="0 0 25 25" className="h-28 w-28" shapeRendering="crispEdges">
              <rect width="25" height="25" fill="white" />
              {/* Finder pattern top-left */}
              <path d="M0,0h7v1H0zM0,6h7v1H0zM0,1h1v5H0zM6,1h1v5H6zM2,2h3v3H2z" fill="black" />
              {/* Finder pattern top-right */}
              <path d="M18,0h7v1H18zM18,6h7v1H18zM18,1h1v5H18zM24,1h1v5H24zM20,2h3v3H20z" fill="black" />
              {/* Finder pattern bottom-left */}
              <path d="M0,18h7v1H0zM0,24h7v1H0zM0,19h1v5H0zM6,19h1v5H6zM2,20h3v3H2z" fill="black" />
              {/* Timing patterns */}
              <path d="M8,6h1v1H8zM10,6h1v1H10zM12,6h1v1H12zM14,6h1v1H14zM16,6h1v1H16z" fill="black" />
              <path d="M6,8h1v1H6zM6,10h1v1H6zM6,12h1v1H6zM6,14h1v1H6zM6,16h1v1H6z" fill="black" />
              {/* Alignment pattern */}
              <path d="M18,18h5v1H18zM18,22h5v1H18zM18,19h1v3H18zM22,19h1v3H22zM20,20h1v1H20z" fill="black" />
              {/* Dense data modules */}
              <path d="M8,0h1v1H8zM10,0h1v1H10zM11,0h1v1H11zM13,0h1v1H13zM15,0h1v1H15z" fill="black" />
              <path d="M9,1h1v1H9zM11,1h1v1H11zM12,1h1v1H12zM14,1h1v1H14zM16,1h1v1H16z" fill="black" />
              <path d="M8,2h1v1H8zM10,2h1v1H10zM13,2h1v1H13zM15,2h1v1H15zM16,2h1v1H16z" fill="black" />
              <path d="M9,3h1v1H9zM10,3h1v1H10zM12,3h1v1H12zM14,3h1v1H14z" fill="black" />
              <path d="M8,4h1v1H8zM11,4h1v1H11zM13,4h1v1H13zM15,4h1v1H15zM16,4h1v1H16z" fill="black" />
              <path d="M9,5h1v1H9zM10,5h1v1H10zM12,5h1v1H12zM14,5h1v1H14z" fill="black" />
              <path d="M8,8h1v1H8zM9,8h1v1H9zM11,8h1v1H11zM13,8h1v1H13zM15,8h1v1H15zM17,8h1v1H17zM19,8h1v1H19zM21,8h1v1H21zM23,8h1v1H23z" fill="black" />
              <path d="M0,8h1v1H0zM2,8h1v1H2zM4,8h1v1H4z" fill="black" />
              <path d="M8,9h1v1H8zM10,9h1v1H10zM12,9h1v1H12zM14,9h1v1H14zM16,9h1v1H16zM18,9h1v1H18zM20,9h1v1H20zM22,9h1v1H22z" fill="black" />
              <path d="M1,9h1v1H1zM3,9h1v1H3zM5,9h1v1H5z" fill="black" />
              <path d="M7,10h1v1H7zM9,10h1v1H9zM11,10h1v1H11zM13,10h1v1H13zM15,10h1v1H15zM17,10h1v1H17zM19,10h1v1H19zM21,10h1v1H21zM24,10h1v1H24z" fill="black" />
              <path d="M0,10h1v1H0zM2,10h1v1H2zM4,10h1v1H4z" fill="black" />
              <path d="M8,11h1v1H8zM10,11h1v1H10zM11,11h1v1H11zM14,11h1v1H14zM16,11h1v1H16zM18,11h1v1H18zM20,11h1v1H20zM23,11h1v1H23z" fill="black" />
              <path d="M1,11h1v1H1zM3,11h1v1H3zM5,11h1v1H5z" fill="black" />
              <path d="M7,12h1v1H7zM9,12h1v1H9zM11,12h1v1H11zM13,12h1v1H13zM15,12h1v1H15zM17,12h1v1H17zM20,12h1v1H20zM22,12h1v1H22zM24,12h1v1H24z" fill="black" />
              <path d="M0,12h1v1H0zM2,12h1v1H2zM4,12h1v1H4z" fill="black" />
              <path d="M8,13h1v1H8zM10,13h1v1H10zM12,13h1v1H12zM14,13h1v1H14zM17,13h1v1H17zM19,13h1v1H19zM21,13h1v1H21zM23,13h1v1H23z" fill="black" />
              <path d="M1,13h1v1H1zM3,13h1v1H3z" fill="black" />
              <path d="M7,14h1v1H7zM9,14h1v1H9zM11,14h1v1H11zM14,14h1v1H14zM16,14h1v1H16zM18,14h1v1H18zM20,14h1v1H20zM22,14h1v1H22zM24,14h1v1H24z" fill="black" />
              <path d="M0,14h1v1H0zM2,14h1v1H2zM5,14h1v1H5z" fill="black" />
              <path d="M8,15h1v1H8zM10,15h1v1H10zM12,15h1v1H12zM13,15h1v1H13zM15,15h1v1H15zM17,15h1v1H17zM19,15h1v1H19zM21,15h1v1H21zM24,15h1v1H24z" fill="black" />
              <path d="M1,15h1v1H1zM4,15h1v1H4z" fill="black" />
              <path d="M7,16h1v1H7zM9,16h1v1H9zM11,16h1v1H11zM13,16h1v1H13zM15,16h1v1H15zM17,16h1v1H17z" fill="black" />
              <path d="M0,16h1v1H0zM3,16h1v1H3zM5,16h1v1H5z" fill="black" />
              <path d="M8,17h1v1H8zM10,17h1v1H10zM12,17h1v1H12zM14,17h1v1H14zM16,17h1v1H16z" fill="black" />
              {/* Bottom-right data */}
              <path d="M8,18h1v1H8zM10,18h1v1H10zM12,18h1v1H12zM14,18h1v1H14zM16,18h1v1H16z" fill="black" />
              <path d="M9,19h1v1H9zM11,19h1v1H11zM13,19h1v1H13zM15,19h1v1H15zM17,19h1v1H17z" fill="black" />
              <path d="M8,20h1v1H8zM10,20h1v1H10zM12,20h1v1H12zM14,20h1v1H14zM16,20h1v1H16z" fill="black" />
              <path d="M9,21h1v1H9zM11,21h1v1H11zM13,21h1v1H13zM15,21h1v1H15zM17,21h1v1H17z" fill="black" />
              <path d="M8,22h1v1H8zM10,22h1v1H10zM12,22h1v1H12zM15,22h1v1H15zM17,22h1v1H17z" fill="black" />
              <path d="M9,23h1v1H9zM11,23h1v1H11zM13,23h1v1H13zM14,23h1v1H14zM16,23h1v1H16z" fill="black" />
              <path d="M8,24h1v1H8zM10,24h1v1H10zM12,24h1v1H12zM15,24h1v1H15zM17,24h1v1H17z" fill="black" />
              {/* Right-side data */}
              <path d="M24,18h1v1H24zM24,20h1v1H24zM24,22h1v1H24zM24,24h1v1H24z" fill="black" />
              <path d="M23,19h1v1H23zM23,21h1v1H23zM23,23h1v1H23z" fill="black" />
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
        <div
          className={`relative ${onClickIcon ? 'group/icon cursor-pointer' : ''}`}
          onClick={onClickIcon}
        >
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
          {onClickIcon && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/icon:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <Pencil className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
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
