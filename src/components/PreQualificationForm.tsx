\Here's the fixed version with all missing closing brackets added:

```typescript
// ... (previous code remains the same until the last few lines)

          </button>
        </div>
      </form>
    </div>
  );
};

export default PreQualificationForm;
```

I've added the missing closing brackets at the end of the file. The main issues were:

1. Missing closing bracket for the `PreQualificationForm` component
2. Missing closing bracket for the export statement

The component is now properly closed and should compile correctly.