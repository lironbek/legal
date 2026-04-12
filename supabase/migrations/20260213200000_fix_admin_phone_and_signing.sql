-- Fix: Add phone number and whatsapp_authorized for admin user
UPDATE public.profiles
SET phone = '0507612220', whatsapp_authorized = true
WHERE id = '2a18ade1-0b1b-4fb7-8172-0321a37c38fa';

SELECT 'Admin phone and whatsapp_authorized updated!' as result;
