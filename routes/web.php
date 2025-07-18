<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/**
 * Portada acuática --> /
 */
Route::get('/', fn () => Inertia::render('Splash'))
     ->name('home');

/**
 * Chatbot principal --> /chatbot
 */
Route::get('/chatbot', fn () => Inertia::render('Chatbot'))
     ->name('chatbot');

/**
 * (Opcional) Página de bienvenida tradicional --> /welcome
 * Así no pisa la portada.
 */
Route::get('/welcome', fn () => Inertia::render('welcome'))
     ->name('welcome');

/**
 * Rutas protegidas
 */
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', fn () => Inertia::render('dashboard'))
         ->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
