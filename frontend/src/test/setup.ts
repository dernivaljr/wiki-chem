import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { failure } from './mockApi'

configure({ asyncUtilTimeout: 3000 })
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => failure())) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
