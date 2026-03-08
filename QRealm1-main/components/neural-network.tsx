"use client"

import { useEffect, useRef } from "react"

interface Node {
    x: number
    y: number
    vx: number
    vy: number
    connections: number[]
    pulse: number
    pulseSpeed: number
}

export function NeuralNetwork({ className }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

        const W = 500
        const H = 400
        canvas.width = W
        canvas.height = H

        let animId: number
        const nodes: Node[] = []
        const nodeCount = 18

        // Create nodes
        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: 40 + Math.random() * (W - 80),
                y: 40 + Math.random() * (H - 80),
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                connections: [],
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: 0.01 + Math.random() * 0.02,
            })
        }

        // Create connections
        nodes.forEach((node, i) => {
            const distances: { idx: number; d: number }[] = []
            nodes.forEach((other, j) => {
                if (i !== j) {
                    const dx = node.x - other.x
                    const dy = node.y - other.y
                    distances.push({ idx: j, d: Math.sqrt(dx * dx + dy * dy) })
                }
            })
            distances.sort((a, b) => a.d - b.d)
            node.connections = distances.slice(0, 3).map((d) => d.idx)
        })

        const draw = () => {
            ctx.clearRect(0, 0, W, H)

            // Draw connections
            nodes.forEach((node) => {
                node.connections.forEach((ci) => {
                    const other = nodes[ci]
                    const pulseFactor = (Math.sin(node.pulse) + 1) / 2
                    const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y)
                    gradient.addColorStop(0, `hsla(27, 100%, 55%, ${0.1 + pulseFactor * 0.2})`)
                    gradient.addColorStop(0.5, `hsla(33, 100%, 53%, ${0.05 + pulseFactor * 0.15})`)
                    gradient.addColorStop(1, `hsla(27, 100%, 55%, ${0.1 + pulseFactor * 0.2})`)

                    ctx.beginPath()
                    ctx.moveTo(node.x, node.y)
                    ctx.lineTo(other.x, other.y)
                    ctx.strokeStyle = gradient
                    ctx.lineWidth = 1
                    ctx.stroke()
                })
            })

            // Draw nodes
            nodes.forEach((node) => {
                const pulseFactor = (Math.sin(node.pulse) + 1) / 2
                const radius = 3 + pulseFactor * 2

                // Outer glow
                const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 5)
                glow.addColorStop(0, `hsla(27, 100%, 55%, ${0.2 + pulseFactor * 0.15})`)
                glow.addColorStop(1, "hsla(27, 100%, 55%, 0)")
                ctx.beginPath()
                ctx.arc(node.x, node.y, radius * 5, 0, Math.PI * 2)
                ctx.fillStyle = glow
                ctx.fill()

                // Core
                ctx.beginPath()
                ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
                ctx.fillStyle = `hsla(27, 100%, 60%, ${0.6 + pulseFactor * 0.4})`
                ctx.fill()

                if (!prefersReduced) {
                    // Update position
                    node.x += node.vx
                    node.y += node.vy
                    node.pulse += node.pulseSpeed

                    // Bounce off edges
                    if (node.x < 20 || node.x > W - 20) node.vx *= -1
                    if (node.y < 20 || node.y > H - 20) node.vy *= -1
                }
            })

            animId = requestAnimationFrame(draw)
        }

        draw()

        return () => cancelAnimationFrame(animId)
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ width: "100%", height: "100%", maxWidth: 500, maxHeight: 400 }}
            aria-hidden="true"
        />
    )
}
