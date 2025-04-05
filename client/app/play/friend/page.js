'use client';

import { useRouter } from 'next/navigation';
import { MantineProvider, Button, Container, Text, Title, Flex } from '@mantine/core';
import dynamic from 'next/dynamic';

const ChessBoard = dynamic(() => import('../../components/ChessBoard'), { ssr: false });

export default function MultiplayerPage() {
  const router = useRouter();
  
  return (
    <MantineProvider>
      <main className="min-h-screen flex flex-col bg-gray-900 py-6">
        <Container size="lg" className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <Title className="text-white text-2xl md:text-3xl">ChessMate - Play with Friend</Title>
            <Button 
              variant="outline" 
              color="gray" 
              onClick={() => router.push('/')}
              className="border-gray-600 text-gray-300"
            >
              Back to Menu
            </Button>
          </div>
          
          <div className="flex flex-col items-center justify-center flex-1">
            <ChessBoard />
          </div>
          
          <Flex justify="center" gap="md" className="mt-6">
            <Text className="text-green-500 text-center">
              Player 1: White
            </Text>
            <Text className="text-gray-400">vs</Text>
            <Text className="text-black text-center font-bold" style={{ textShadow: '0 0 2px white' }}>
              Player 2: Black
            </Text>
          </Flex>
        </Container>
      </main>
    </MantineProvider>
  );
} 