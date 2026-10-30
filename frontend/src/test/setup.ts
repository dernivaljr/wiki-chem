import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { failure } from './mockApi'

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => failure())) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
